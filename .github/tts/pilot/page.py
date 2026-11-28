"""Builds idiomas/tts-pilot/: mp3 clips + a page to compare, line by line, the current voices (edge-tts) with
Qwen3-TTS and Chatterbox, for the same character voice."""
import json, os, shutil, subprocess, hashlib, html
OUT = '../../../idiomas/tts-pilot'
P = json.load(open('out/pilot.json'))
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
mp3 = lambda src, dst: subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-ac', '1', '-b:a', '64k', f'{OUT}/{dst}'], check=True) or dst
rows = []
for c in P:
    idx = {}
    try: idx = json.load(open(f"../../../{c['app']}-app/data/audio/story.json", encoding='utf8'))
    except Exception: pass
    ref = mp3(f"out/ref/{c['app']}-{c['who']}.wav", f"{c['app']}-{c['who']}-ref.mp3")
    lines = []
    for k, t in enumerate(c['lines']):
        cell = {'t': t}
        for eng in ('qwen', 'chatter'):
            f = f"out/{eng}/{c['app']}-{c['who']}-{k}.wav"
            if os.path.exists(f): cell[eng] = mp3(f, f"{c['app']}-{c['who']}-{k}-{eng}.mp3")
        e = idx.get(f"{c['who']}|{t}")
        if e:
            shutil.copy(f"../../../{c['app']}-app/data/audio/story/{e}", f"{OUT}/{c['app']}-{c['who']}-{k}-edge.mp3"); cell['edge'] = f"{c['app']}-{c['who']}-{k}-edge.mp3"
        lines.append(cell)
    rows.append((c, ref, lines))
A = lambda f: f'<audio controls preload="none" src="{f}"></audio>' if f else '<span class="na">—</span>'
body = ''.join(f"""<section><h2>{html.escape(c['app'])} · {html.escape(c['who'])}</h2><p class="d">{html.escape(c['instruct'])}</p>
<p><b>Voz diseñada (referencia):</b> {A(ref)}</p>
<table><tr><th>Frase</th><th>Actual (edge-tts)</th><th>Qwen3-TTS</th><th>Chatterbox</th></tr>
{''.join(f"<tr><td lang='{c['lang']}'>{html.escape(l['t'])}</td><td>{A(l.get('edge'))}</td><td>{A(l.get('qwen'))}</td><td>{A(l.get('chatter'))}</td></tr>" for l in lines)}</table></section>""" for c, ref, lines in rows)
open(f'{OUT}/index.html', 'w').write(f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Prueba de voces</title><style>body{{font:15px/1.5 system-ui;margin:0;background:#f7f3ec;color:#2b2340}}.w{{max-width:900px;margin:auto;padding:20px}}section{{background:#fff;border-radius:16px;padding:14px 16px;margin:14px 0;box-shadow:0 2px 10px rgba(0,0,0,.06)}}
h2{{margin:0 0 4px;font-size:18px}}.d{{color:#7a6e60;font-size:13px;margin:0 0 8px}}table{{width:100%;border-collapse:collapse}}td,th{{border-top:1px solid #eee;padding:6px 4px;text-align:left;vertical-align:middle;font-size:14px}}audio{{width:150px;height:34px}}.na{{color:#bbb}}</style></head>
<body><div class="w"><h1>Prueba de voces de los personajes</h1><p>La misma voz por personaje (diseñada con Qwen3-TTS a partir de una descripción, sin clonar a ninguna persona real) leída por dos modelos libres, frente a la voz actual. Qwen3-TTS no tiene árabe.</p>{body}</div></body></html>""")
print('ok', len(rows))
