// ============================================================
//  test-update-server.js — 更新系统验证用·零依赖静态服务器（带故障注入）
//  2026-06-10·更新功能全面升级配套验证基建
//
//  用法（CLI）·
//    node web/scripts/test-update-server.js --root <dir> [--port 8123]
//      [--no-range]                Range 请求一律按 200 全量回（模拟不支持断点续传的服务器）
//      [--drop-after-bytes N]      命中 --drop-path 的响应在发出 N 字节后掐断 socket
//      [--drop-path substr]        掐断哪些路径（子串匹配·默认 .zip）
//      [--drop-times K]            只掐前 K 次（默认 1·之后恢复正常·配合重试验证）
//      [--fail-first K]            每个路径前 K 次请求回 500
//      [--corrupt substr]          命中路径的响应翻转第一个字节（sha 校验应失败）
//
//  用法（in-process·verify 脚本里）·
//    const { createTestUpdateServer } = require('./test-update-server.js');
//    const srv = createTestUpdateServer({ root, dropAfterBytes: 1024, ... });
//    await srv.listen(0);  // 0 = 随机端口·srv.port 取实际端口
//    ... srv.requests 是收到的请求日志 [{method,url,headers}] ...
//    await srv.close();
// ============================================================
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.zip': 'application/zip',
  '.png': 'image/png',
  '.yml': 'text/yaml; charset=utf-8'
};

function createTestUpdateServer(opts) {
  opts = opts || {};
  const root = path.resolve(opts.root || '.');
  const noRange = !!opts.noRange;
  const dropAfterBytes = Number(opts.dropAfterBytes || 0);
  const dropPath = String(opts.dropPath || '.zip');
  let dropTimes = opts.dropTimes == null ? 1 : Number(opts.dropTimes);
  const failFirst = Number(opts.failFirst || 0);
  const corrupt = String(opts.corrupt || '');
  const failCounts = Object.create(null); // 路径 → 已回 500 次数
  const requests = [];

  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(String(req.url || '/').split('?')[0]);
    requests.push({ method: req.method, url: req.url, path: urlPath, headers: req.headers });

    const target = path.resolve(root, '.' + urlPath.replace(/\/+$/, urlPath === '/' ? '/index.html' : ''));
    const rel = path.relative(root, target);
    if (rel.startsWith('..') || path.isAbsolute(rel)) { res.writeHead(403); res.end('forbidden'); return; }
    let file = target;
    try { if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); } catch (_) {}
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('not found'); return; }

    if (failFirst > 0) {
      failCounts[urlPath] = failCounts[urlPath] || 0;
      if (failCounts[urlPath] < failFirst) {
        failCounts[urlPath]++;
        res.writeHead(500); res.end('injected failure ' + failCounts[urlPath]);
        return;
      }
    }

    const stat = fs.statSync(file);
    const total = stat.size;
    const ext = path.extname(file).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';

    // Range 解析
    let start = 0, end = total - 1, status = 200;
    const rangeHeader = String(req.headers.range || '');
    if (rangeHeader && !noRange) {
      const m = rangeHeader.match(/^bytes=(\d+)-(\d*)$/);
      if (m) {
        start = parseInt(m[1], 10);
        if (m[2]) end = Math.min(parseInt(m[2], 10), total - 1);
        if (start >= total) {
          res.writeHead(416, { 'Content-Range': 'bytes */' + total });
          res.end();
          return;
        }
        status = 206;
      }
    }

    const headers = {
      'Content-Type': mime,
      'Content-Length': end - start + 1,
      'Accept-Ranges': noRange ? 'none' : 'bytes',
      'Cache-Control': 'no-store'
    };
    if (status === 206) headers['Content-Range'] = 'bytes ' + start + '-' + end + '/' + total;
    res.writeHead(status, headers);
    if (req.method === 'HEAD') { res.end(); return; }

    // corrupt 注入·小文件整读翻字节（大 zip 不建议配 corrupt·内存）
    if (corrupt && urlPath.indexOf(corrupt) !== -1) {
      const buf = fs.readFileSync(file).subarray(start, end + 1);
      if (buf.length > 0) buf[0] = buf[0] ^ 0xff;
      res.end(buf);
      return;
    }

    // drop 注入·发 dropAfterBytes 后掐 socket
    const shouldDrop = dropAfterBytes > 0 && dropTimes > 0 && urlPath.indexOf(dropPath) !== -1;
    if (shouldDrop) {
      dropTimes--;
      const stream = fs.createReadStream(file, { start, end });
      let sent = 0;
      stream.on('data', chunk => {
        const remain = dropAfterBytes - sent;
        if (chunk.length >= remain) {
          res.write(chunk.subarray(0, Math.max(0, remain)));
          sent += remain;
          stream.destroy();
          res.destroy(); // 模拟连接中断
        } else {
          sent += chunk.length;
          res.write(chunk);
        }
      });
      stream.on('error', () => { try { res.destroy(); } catch (_) {} });
      return;
    }

    const stream = fs.createReadStream(file, { start, end });
    stream.pipe(res);
    stream.on('error', () => { try { res.destroy(); } catch (_) {} });
  });

  return {
    server,
    requests,
    get port() { const a = server.address(); return a ? a.port : 0; },
    listen(port) {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port == null ? 0 : port, '127.0.0.1', () => resolve(server.address().port));
      });
    },
    close() {
      return new Promise(resolve => {
        // keep-alive 连接会吊死 server.close()·强制断开（Node ≥18.2）
        try { if (typeof server.closeAllConnections === 'function') server.closeAllConnections(); } catch (_) {}
        server.close(() => resolve());
      });
    }
  };
}

module.exports = { createTestUpdateServer };

if (require.main === module) {
  const args = process.argv.slice(2);
  const get = (name, dflt) => {
    const i = args.indexOf('--' + name);
    return i !== -1 && args[i + 1] !== undefined ? args[i + 1] : dflt;
  };
  const has = name => args.indexOf('--' + name) !== -1;
  const srv = createTestUpdateServer({
    root: get('root', '.'),
    noRange: has('no-range'),
    dropAfterBytes: Number(get('drop-after-bytes', 0)),
    dropPath: get('drop-path', '.zip'),
    dropTimes: Number(get('drop-times', 1)),
    failFirst: Number(get('fail-first', 0)),
    corrupt: get('corrupt', '')
  });
  srv.listen(Number(get('port', 8123))).then(port => {
    console.log('[test-update-server] http://127.0.0.1:' + port + '/ 根目录·' + path.resolve(get('root', '.')));
  });
}
