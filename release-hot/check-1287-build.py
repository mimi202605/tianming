# -*- coding: utf-8 -*-
import zipfile, json, os
z = 'release-hot/tianming-hot-1.2.8.7.zip'
print('zip size: %.1f MB' % (os.path.getsize(z)/1024/1024))
hl = json.load(open('release-hot/hot-latest.json', encoding='utf-8'))
print('hot-latest: version=%s sha=%s size=%s' % (hl.get('version'), str(hl.get('sha256'))[:12], hl.get('size')))
with zipfile.ZipFile(z) as zf:
    m = json.loads(zf.read('manifest.json'))
buckets = {}
for f in m['files']:
    top = (f['path'].split('/')[0]) or '.'
    buckets[top] = buckets.get(top, 0) + f.get('size', 0)
print('manifest files:', len(m['files']))
print('top buckets:')
for k, v in sorted(buckets.items(), key=lambda x: -x[1])[:12]:
    print('  %s: %.1f MB' % (k, v/1024/1024))
bad = [k for k in buckets if k in ('godot', 'preview', '_screenshots', 'backups', '_archive')]
print('SUSPECT dirs present:', bad if bad else 'none')
