"""Step 1: design one voice per character (Qwen3-TTS VoiceDesign) -> refs/<app>/<who>.wav + refs/<app>/refs.json.
Existing refs are kept, so voices never change once made.   Usage: python voices.py <app>"""
import json, os, sys, torch, soundfile as sf
from common import LANG, ROOT, cast, lines
app = sys.argv[1]; lang, qlang = LANG[app]
d = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'refs', app); os.makedirs(d, exist_ok=True)
rp = os.path.join(d, 'refs.json'); refs = json.load(open(rp)) if os.path.exists(rp) else {}
C, L = cast(app), lines(app)
todo = [w for w in C if w not in refs]
if not todo: print('all voices exist'); sys.exit()
from qwen_tts import Qwen3TTSModel
vd = Qwen3TTSModel.from_pretrained('Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign', device_map='cpu', dtype=torch.float32)
for who in todo:
    mine = [t for w, t in L if w == who and 12 <= len(t) <= 70]
    if qlang and mine: text, ql = mine[0], qlang
    else: text, ql = 'Hello! Today I will tell you a little story about my village and my friends.', 'English'
    torch.manual_seed(1234)
    wavs, sr = vd.generate_voice_design(text=text, language=ql, instruct=C[who]['instruct'])
    sf.write(os.path.join(d, f'{who}.wav'), wavs[0], sr)
    refs[who] = {'text': text, 'lang': ql, 'instruct': C[who]['instruct']}
    json.dump(refs, open(rp, 'w'), ensure_ascii=False, indent=1)
    print('voice', app, who, flush=True)
