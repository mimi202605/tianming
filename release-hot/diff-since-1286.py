# -*- coding: utf-8 -*-
import json, hashlib, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
man = json.load(open(os.path.join(ROOT, 'release-hot', 'manifests', '1.2.8.6.json'), encoding='utf-8'))
base = {f['path']: f['sha256'] for f in man['files']}
exts = ('.js', '.json', '.html', '.css', '.md')
skip_dirs = {'node_modules', 'backups', '_archive', '_screenshots', 'assets', 'godot', 'preview', '.git', 'scripts'}
changed, new = [], []
for p, sha in base.items():
    if not p.lower().endswith(exts):
        continue
    fp = os.path.join(ROOT, 'web', p)
    if not os.path.isfile(fp):
        continue
    h = hashlib.sha256(open(fp, 'rb').read()).hexdigest()
    if h != sha:
        changed.append(p)
webdir = os.path.join(ROOT, 'web')
for root, dirs, files in os.walk(webdir):
    dirs[:] = [d for d in dirs if d not in skip_dirs]
    for fn in files:
        if not fn.lower().endswith(exts) or '.bak' in fn:
            continue
        rel = os.path.relpath(os.path.join(root, fn), webdir).replace('\\', '/')
        if rel not in base:
            new.append(rel)
print('CHANGED code files vs 1.2.8.6 (%d):' % len(changed))
for c in sorted(changed):
    print('  ~ ' + c)
print('NEW code files (%d):' % len(new))
for n in sorted(new)[:50]:
    print('  + ' + n)
