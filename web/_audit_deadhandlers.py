import re, os, sys

base = r'C:/Users/37814/Desktop/tianming/web'
files = [l.strip() for l in open(os.path.join(base, 'scope.txt'), encoding='utf-8') if l.strip()]

# --- Step 1: extract bare handler names with their reference sites ---
ev = (r'on(?:click|change|input|submit|keyup|keydown|keypress|mousedown|mouseup|'
      r'mouseover|mouseout|mouseenter|mouseleave|focus|blur|dblclick|wheel|'
      r'touchstart|touchend|contextmenu|scroll|load|error)')
pat = re.compile(ev + r'\s*=\s*(?:\\+|["\'`]|&quot;|&#39;|&apos;)+\s*'
                 r'([A-Za-z_$][A-Za-z0-9_$]*(?:\s*\.\s*[A-Za-z_$][A-Za-z0-9_$]*)*)\s*\(')

# also catch setAttribute('onX', 'NAME(...') and elem.onX = NAME / function
setattr_pat = re.compile(r'setAttribute\(\s*["\']on\w+["\']\s*,\s*["\'`]\s*'
                         r'([A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*)\s*\(')

corpus = {}
for f in files:
    with open(os.path.join(base, f), encoding='utf-8', errors='replace') as fh:
        corpus[f] = fh.read()

bare = {}
for f in files:
    for i, line in enumerate(corpus[f].splitlines(), 1):
        for m in pat.finditer(line):
            chain = m.group(1)
            if '.' in chain:
                continue
            bare.setdefault(chain.strip(), []).append((f, i))
        for m in setattr_pat.finditer(line):
            chain = m.group(1)
            if '.' in chain:
                continue
            bare.setdefault(chain.strip(), []).append((f, i))

drop = {'if', 'prompt', 'alert', 'confirm', 'event', 'return', 'this', 'for', 'while',
        'switch', 'function', 'var', 'let', 'const', 'new', 'typeof', 'void', 'delete',
        'parseInt', 'parseFloat', 'Number', 'String', 'Boolean', 'Array', 'Object',
        'JSON', 'Math', 'Date', 'window', 'document', 'console', 'setTimeout',
        'setInterval', 'requestAnimationFrame'}
cands = [c for c in bare if c not in drop]

def def_regex(name):
    n = re.escape(name)
    pats = [
        rf'function\s+{n}\b',
        rf'\b{n}\s*=\s*function\b',
        rf'\b{n}\s*=\s*async\b',
        rf'\b{n}\s*=\s*\(',
        rf'\b{n}\s*=\s*[A-Za-z_$][A-Za-z0-9_$]*\s*=>',
        rf'\bwindow\.{n}\s*=',
        rf'\bglobalThis\.{n}\s*=',
        rf'\bself\.{n}\s*=',
        rf'\b(?:var|let|const)\s+{n}\b',
        rf'\b{n}\s*:\s*function\b',
        rf'\b{n}\s*:\s*async\b',
        rf'\b{n}\s*:\s*\(',
        rf'\b{n}\s*:\s*[A-Za-z_$][A-Za-z0-9_$]*\s*=>',
        rf'\b{n}\s*\([^)]*\)\s*\{{',
        rf"\[\s*['\"]{n}['\"]\s*\]\s*=",
    ]
    return re.compile('|'.join(pats))

zero = []
for c in cands:
    rx = def_regex(c)
    if not any(rx.search(txt) for txt in corpus.values()):
        zero.append(c)

print("TOTAL DISTINCT BARE CANDIDATES:", len(cands))
print("ZERO-DEFINITION CANDIDATES:", len(zero))
print("=" * 50)
for z in sorted(zero):
    refs = bare[z][:4]
    print(f"{z}  | refs: {refs}")
