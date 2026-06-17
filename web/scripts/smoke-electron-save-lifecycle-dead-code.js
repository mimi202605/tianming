const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function assert(cond, message) {
  if (!cond) {
    console.error('[electron-save-lifecycle-dead-code] FAIL:', message);
    process.exit(1);
  }
}

const electron = read('tm-electron.js');
const saveLifecycle = read('tm-save-lifecycle.js');
const index = read('index.html');
const verifyAll = read(path.join('scripts', 'verify-all.js'));

const electronScript = index.indexOf('tm-electron.js');
const saveLifecycleScript = index.indexOf('tm-save-lifecycle.js');
assert(electronScript !== -1, 'index.html must load tm-electron.js');
assert(saveLifecycleScript !== -1, 'index.html must load tm-save-lifecycle.js');
assert(
  electronScript < saveLifecycleScript,
  'tm-save-lifecycle.js must load after tm-electron.js so it owns final save/load globals'
);

[
  /\bdoSaveGame\s*=\s*async\s+function\s*\(/,
  /\bdoLoadSave\s*=\s*async\s+function\s*\(/,
  /window\.desktopDoSave\s*=\s*async\s+function\s*\(/,
  /window\.desktopLoadSave\s*=\s*async\s+function\s*\(/,
  /window\.desktopDeleteSave\s*=\s*async\s+function\s*\(/
].forEach((pattern) => {
  assert(!pattern.test(electron), `tm-electron.js still owns obsolete save/load definition: ${pattern}`);
});

[
  /\bdoSaveGame\s*=\s*async\s+function\s*\(/,
  /\bdoLoadSave\s*=\s*function\s*\(/,
  /window\.desktopDoSave\s*=\s*async\s+function\s*\(/,
  /window\.desktopLoadSave\s*=\s*async\s+function\s*\(/,
  /window\.desktopDeleteSave\s*=\s*async\s+function\s*\(/
].forEach((pattern) => {
  assert(pattern.test(saveLifecycle), `tm-save-lifecycle.js must retain active save/load owner: ${pattern}`);
});

assert(
  verifyAll.includes('smoke-electron-save-lifecycle-dead-code.js'),
  'verify-all.js must register this dead-code guard'
);

console.log('[electron-save-lifecycle-dead-code] PASS');
