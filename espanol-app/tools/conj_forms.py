"""All forms shown by the conjugation view (js/conj.js), computed by running that same file with node."""
import json, subprocess
from pathlib import Path

JS = Path(__file__).resolve().parent.parent / 'js' / 'conj.js'


def conj_forms():
    code = f"""import('{JS.as_uri()}').then(m => {{
      const out = new Set();
      for (const v of m.VERBS) {{
        out.add(v.w); out.add(m.participle(v)); out.add(m.gerund(v));
        for (const t of m.TENSES) for (const p of [0,1,2,3,4,5]) {{ const f = m.conjugate(v, t.id, p); if (f && f !== '—') out.add(f); }}
        out.add('no ' + m.conjugate(v, 'subj', 1));
      }}
      console.log(JSON.stringify([...out]));
    }})"""
    try:
        r = subprocess.run(['node', '--input-type=module', '-e', code], capture_output=True, text=True, timeout=60)
        return json.loads(r.stdout)
    except Exception as e:
        print('conj forms skipped:', e)
        return []
