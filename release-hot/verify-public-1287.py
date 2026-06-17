# -*- coding: utf-8 -*-
import urllib.request, ssl, json, time
ctx = ssl.create_default_context()
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'
BASE = 'https://api.themisfitserspeople.top/tianming'
cb = str(int(time.time() * 1000))  # cache-bust (passed in via not Date — using time ok at runtime, not in workflow)

def get(url, rng=None):
    h = {'User-Agent': UA, 'Accept': '*/*', 'Cache-Control': 'no-cache'}
    if rng: h['Range'] = rng
    return urllib.request.urlopen(urllib.request.Request(url, headers=h), context=ctx, timeout=60)

# 1. hot-latest.json
r = get(BASE + '/hot/hot-latest.json?cb=' + cb)
hl = json.loads(r.read().decode('utf-8'))
print('HL version=', hl.get('version'), 'sha=', str(hl.get('sha256'))[:12], 'size=', hl.get('size'))

# 2. zip head (PK) + range
r2 = get(BASE + '/hot/tianming-hot-1.2.8.7.zip', rng='bytes=0-7')
head = r2.read()
print('ZIP status=', r2.status, 'magic=', head.hex(), 'isPK=', head[:2] == b'PK', 'CF=', r2.headers.get('CF-Cache-Status'), 'CR=', r2.headers.get('Content-Range'))

# 3. standalone changelog (邸报)
r3 = get(BASE + '/changelog.json?cb=' + cb)
clj = json.loads(r3.read().decode('utf-8'))
e0 = (clj.get('entries') or [{}])[0]
print('CL top date=', e0.get('date'), '| module has 1.2.8.7:', '1.2.8.7' in (e0.get('module') or ''))

# 4. manifest (incremental) present?
try:
    r4 = get(BASE + '/hot/manifests/1.2.8.7.json', rng='bytes=0-0')
    print('MANIFEST status=', r4.status, '(present)')
except urllib.error.HTTPError as ex:
    print('MANIFEST HTTPError', ex.code, '(MISSING if 404)')
