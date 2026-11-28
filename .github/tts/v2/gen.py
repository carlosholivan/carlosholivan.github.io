"""Step 2: read the lines of a shard with each character's voice, check every clip with speech recognition
(faster-whisper) and retry with another seed if it does not say the text; failed lines keep their old clip.
Writes out/<app>/<file>.mp3 and out/<app>/map-<shard>.json {who|text: file}.  Usage: python gen.py <app> <shard> <n>"""
import json, os, re, subprocess, sys, unicodedata, torch, soundfile as sf, numpy as np
from common import LANG, ROOT, lines, key_hash
app, shard, n = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
lang, qlang = LANG[app]
here = os.path.dirname(os.path.abspath(__file__))
refs = json.load(open(f'{here}/refs/{app}/refs.json'))
todo = [(w, t) for k, (w, t) in enumerate(lines(app)) if k % n == shard and w in refs]
out = f'{here}/out/{app}'; os.makedirs(out, exist_ok=True)
print(len(todo), 'lines', flush=True)

from faster_whisper import WhisperModel
asr = WhisperModel('small', device='cpu', compute_type='int8')
norm = lambda s: re.sub(r'[\W_]+', '', re.sub('[ً-ْٰـ]', '', unicodedata.normalize('NFKC', s)).lower())
def cer(a, b):
    a, b = norm(a), norm(b)
    if not a: return 1.0
    d = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        p, d[0] = d[0], i
        for j, cb in enumerate(b, 1): p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (ca != cb))
    return d[len(b)] / len(a)
def check(wav, sr, text):
    dur = len(wav) / sr
    chars = len(norm(text)) or 1
    per = dur / chars                                   # seconds per character: catches silence and run-on babble
    lo, hi = (0.08, 0.9) if lang in ('zh', 'ja') else (0.025, 0.35)
    if not (lo <= per <= hi) and dur > 0.6: return 9.0
    tmp = f'{out}/_chk.wav'; sf.write(tmp, wav, sr)
    segs, _ = asr.transcribe(tmp, language=lang, beam_size=1, vad_filter=False)
    return cer(text, ''.join(s.text for s in segs))
LIMIT = {'zh': .45, 'ja': .5, 'ar': .55}.get(lang, .35)

if qlang:
    from qwen_tts import Qwen3TTSModel
    m = Qwen3TTSModel.from_pretrained('Qwen/Qwen3-TTS-12Hz-1.7B-Base', device_map='cpu', dtype=torch.float32)
    prompts = {}
    def say(who, text, seed):
        if who not in prompts: prompts[who] = m.create_voice_clone_prompt(ref_audio=f'{here}/refs/{app}/{who}.wav', ref_text=refs[who]['text'], x_vector_only_mode=False)
        torch.manual_seed(seed)
        wavs, sr = m.generate_voice_clone(text=text, language=qlang, voice_clone_prompt=prompts[who])
        return np.asarray(wavs[0]), sr
else:
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    m = ChatterboxMultilingualTTS.from_pretrained(device='cpu')
    def say(who, text, seed):
        torch.manual_seed(seed)
        wav = m.generate(text, language_id=lang, audio_prompt_path=f'{here}/refs/{app}/{who}.wav', exaggeration=0.5, cfg_weight=0.5)
        return wav.squeeze(0).numpy(), m.sr

res, bad = {}, 0
for k, (who, text) in enumerate(todo):
    best = None
    for seed in (7, 11, 23):
        try: wav, sr = say(who, text, seed)
        except Exception as e: print('ERR', who, text[:30], e, flush=True); continue
        e = check(wav, sr, text)
        if best is None or e < best[0]: best = (e, wav, sr)
        if e <= LIMIT: break
    if not best or best[0] > LIMIT: bad += 1; print('keep old:', who, text[:40], round(best[0], 2) if best else '-', flush=True); continue
    f = key_hash(who, text) + '.mp3'
    sf.write(f'{out}/_t.wav', best[1], best[2])
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', f'{out}/_t.wav', '-ac', '1', '-ar', '24000', '-b:a', '48k', f'{out}/{f}'], check=True)
    res[f'{who}|{text}'] = f
    if k % 20 == 0: print(k, '/', len(todo), 'ok', len(res), 'kept old', bad, flush=True)
json.dump(res, open(f'{out}/map-{shard}.json', 'w'), ensure_ascii=False)
for x in ('_t.wav', '_chk.wav'):
    if os.path.exists(f'{out}/{x}'): os.remove(f'{out}/{x}')
print('done', len(res), 'new,', bad, 'kept old')
