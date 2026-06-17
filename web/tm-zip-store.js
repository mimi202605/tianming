// 极简 ZIP 构建器（store/不压缩）。立绘 PNG / 音频 OGG 本已压缩，store 最合适。
// 浏览器：window.TMZipStore；node：module.exports（便于测试）。无第三方依赖。
(function(root){
  'use strict';
  var CRC_T = (function(){ var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
  function crc32(buf){ var c = 0xFFFFFFFF; for (var i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function strBytes(s){
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    var b = []; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); if (c < 128) b.push(c); else if (c < 2048) { b.push(192 | (c >> 6), 128 | (c & 63)); } else { b.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63)); } }
    return new Uint8Array(b);
  }
  function u16(n){ return new Uint8Array([n & 255, (n >> 8) & 255]); }
  function u32(n){ return new Uint8Array([n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]); }

  // entries: [{ name:String, data:Uint8Array }] → Uint8Array(zip)
  function buildZip(entries){
    var parts = [], central = [], offset = 0;
    entries.forEach(function(e){
      var name = strBytes(e.name), data = e.data, crc = crc32(data);
      [u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0)].forEach(function(p){ parts.push(p); });
      parts.push(name); parts.push(data);
      central.push([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]);
      offset += 30 + name.length + data.length;
    });
    var cdStart = offset, cdParts = [];
    central.forEach(function(row){ row.forEach(function(p){ cdParts.push(p); }); });
    var cdLen = cdParts.reduce(function(a, p){ return a + p.length; }, 0);
    var eocd = [u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(cdLen), u32(cdStart), u16(0)];
    var all = parts.concat(cdParts).concat(eocd);
    var total = all.reduce(function(a, p){ return a + p.length; }, 0);
    var out = new Uint8Array(total), pos = 0;
    all.forEach(function(p){ out.set(p, pos); pos += p.length; });
    return out;
  }

  function bytesToBase64(bytes){
    if (typeof btoa === 'undefined' && typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
    var bin = '', chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return btoa(bin);
  }

  var api = { buildZip: buildZip, bytesToBase64: bytesToBase64, crc32: crc32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TMZipStore = api;
})(typeof window !== 'undefined' ? window : null);
