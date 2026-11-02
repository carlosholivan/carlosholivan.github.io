"""Cache-busting: stamps ?v=VERSION on every relative module import and on index.html assets.
usage: python tools/bump_version.py [VERSION]   (default: current timestamp)"""
import glob, os, re, sys, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = sys.argv[1] if len(sys.argv) > 1 else time.strftime('%Y%m%d%H%M')
IMP = re.compile(r"""((?:from|import)\s*\(?\s*['"])(\.{1,2}/[^'"?]+\.js)(?:\?v=[^'"]*)?(['"])""")
n = 0
for p in glob.glob(os.path.join(ROOT, 'js', '**', '*.js'), recursive=True):
    s = open(p, encoding='utf-8').read()
    t = IMP.sub(lambda m: f'{m.group(1)}{m.group(2)}?v={V}{m.group(3)}', s)
    if t != s:
        open(p, 'w', encoding='utf-8').write(t); n += 1
p = os.path.join(ROOT, 'index.html')
s = open(p, encoding='utf-8').read()
s = re.sub(r'((?:src|href)="(?:js/app\.js|css/app\.css))(?:\?v=[^"]*)?"', lambda m: f'{m.group(1)}?v={V}"', s)
open(p, 'w', encoding='utf-8').write(s)
print(f'version {V}: {n} js files updated')
