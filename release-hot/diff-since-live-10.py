# -*- coding: utf-8 -*-
import urllib.request, ssl, json, hashlib, os, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ctx = ssl.create_default_context()
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0'
url = 'https://api.themisfitserspeople.top/tianming/hot/manifests/1.2.8.10.json?cb=' + str(int(time.time()))
r = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), context=ctx, timeout=60)
man = json.loads(r.read().decode('utf-8'))
base = {f['path']: f['sha256'] for f in man['files']}
print('live 1.2.8.10 manifest files:', len(base))
exts = ('.js', '.json', '.html', '.css', '.md')
skip = {'node_modules', 'backups', '_archive', '_screenshots', 'assets', 'godot', 'preview', '.git', 'scripts'}
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
for rootd, dirs, files in os.walk(webdir):
    dirs[:] = [d for d in dirs if d not in skip]
    for fn in files:
        if not fn.lower().endswith(exts) or '.bak' in fn:
            continue
        rel = os.path.relpath(os.path.join(rootd, fn), webdir).replace('\\', '/')
        if rel not in base:
            new.append(rel)
print('CHANGED vs live 1.2.8.10 (%d):' % len(changed))
for c in sorted(changed):
    print('  ~ ' + c)
print('NEW (%d):' % len(new))
for n in sorted(new)[:40]:
    print('  + ' + n)
