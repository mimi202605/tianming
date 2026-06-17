import urllib.request, ssl, json

ctx = ssl.create_default_context()

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

def get(url, range_=None):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
    if range_:
        req.add_header('Range', range_)
    return urllib.request.urlopen(req, context=ctx, timeout=60)

base = 'https://api.themisfitserspeople.top/tianming'

# 1. hot-latest.json
r = get(base + '/hot/hot-latest.json')
hl = json.loads(r.read().decode('utf-8'))
print('HL_version=', hl.get('version'))
print('HL_sha=', hl.get('sha256'))
print('HL_size=', hl.get('size'))

# 2. zip head (PK magic) + total size via Range
r2 = get(base + '/hot/tianming-hot-1.2.8.5.zip', range_='bytes=0-3')
head = r2.read()
print('ZIP_status=', r2.status)
print('ZIP_magic_hex=', head.hex(), 'isPK=', head[:2] == b'PK')
print('ZIP_content_range=', r2.headers.get('Content-Range'))
print('ZIP_content_length=', r2.headers.get('Content-Length'))

# 3. standalone changelog.json (邸报)
r3 = get(base + '/changelog.json')
cl = r3.read().decode('utf-8')
clj = json.loads(cl)
e0 = (clj.get('entries') or [{}])[0]
print('CL_top_date=', e0.get('date'))
print('CL_top_module_has_1285=', '1.2.8.5' in (e0.get('module') or ''))
print('CL_status=', r3.status)
