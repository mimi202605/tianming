# -*- coding: utf-8 -*-
import json, os, hashlib
ROOT = r"C:\Users\37814\Desktop\tianming\web"
MAN = r"C:\Users\37814\Desktop\tianming\release-hot\manifests\1.2.8.6.json"
man = json.load(open(MAN, encoding='utf-8'))
files = man.get('files', [])
prev = {}
for f in files:
    prev[f['path']] = f['sha256']

def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as fh:
        for chunk in iter(lambda: fh.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()

EXT = ('.js', '.json', '.html', '.css')
changed, added_missing = [], []
# 只看 web 根下的代码文件(path 不含子目录分隔或在已知子目录)，跳过 assets/扁平绝对路径噪音
for path, oldsha in prev.items():
    if not path.endswith(EXT):
        continue
    if path.startswith('assets/') or path.startswith('CUsers'):
        continue
    full = os.path.join(ROOT, path.replace('/', os.sep))
    if not os.path.isfile(full):
        added_missing.append(('MISSING_NOW', path))
        continue
    cur = sha(full)
    if cur != oldsha:
        changed.append(path)

changed.sort()
print('=== 自 1.2.8.6 以来变更的代码文件 (%d) ===' % len(changed))
for p in changed:
    print('  ' + p)
if added_missing:
    print('=== 清单中现已不存在 (%d) ===' % len(added_missing))
    for _, p in added_missing:
        print('  ' + p)
