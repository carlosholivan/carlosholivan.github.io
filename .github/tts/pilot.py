"""TTS pilot: one short reading per language with Chatterbox Multilingual (CPU), to judge quality and speed.
Writes tts-pilot/<lang>.mp3 and tts-pilot/<lang>.json (seconds of audio, seconds of compute)."""
import json, os, sys, time, subprocess, urllib.request
import torch, torchaudio
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

lang = sys.argv[1]
PROMPTS = {  # reference voices of the official Chatterbox multilingual demo
    'ar': 'ar_f/ar_prompts2.flac', 'de': 'de_f1.flac', 'en': 'en_f1.flac', 'es': 'es_f1.flac',
    'fr': 'fr_f1.flac', 'ja': 'ja/ja_prompts1.flac', 'zh': 'zh_f2.flac'}
text = json.load(open('.github/tts/pilot_texts.json', encoding='utf8'))[lang]
os.makedirs('tts-pilot', exist_ok=True)
torch.set_num_threads(os.cpu_count() or 4)
t0 = time.time()
model = ChatterboxMultilingualTTS.from_pretrained('cpu')
load = time.time() - t0
ref = f'/tmp/ref_{lang}.flac'
try:
    urllib.request.urlretrieve('https://storage.googleapis.com/chatterbox-demo-samples/mtl_prompts/' + PROMPTS[lang], ref)
except Exception as e:
    print('no reference voice, using the default one:', e); ref = None
t1 = time.time()
kw = dict(language_id=lang, exaggeration=0.5, cfg_weight=0.5, temperature=0.8)
if ref: kw['audio_prompt_path'] = ref
# One sentence at a time (the model can drop the end of long inputs), joined with short pauses.
import re
parts = [x.strip() for x in re.split(r'(?<=[.!?。！？؟])\s*', text) if x.strip()]
pause = torch.zeros(1, int(model.sr * 0.35))
chunks = []
for i, sent in enumerate(parts):
    chunks.append(model.generate(sent, **kw))
    if i < len(parts) - 1: chunks.append(pause)
wav = torch.cat(chunks, dim=-1)
gen = time.time() - t1
torchaudio.save(f'/tmp/{lang}.wav', wav, model.sr)
dur = wav.shape[-1] / model.sr
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'/tmp/{lang}.wav', '-ac', '1', '-b:a', '64k', f'tts-pilot/{lang}.mp3'], check=True)
info = {'lang': lang, 'chars': len(text), 'audio_s': round(dur, 1), 'compute_s': round(gen, 1), 'rtf': round(gen / dur, 2),
        'load_s': round(load, 1), 'cpus': os.cpu_count(), 'ref': bool(ref), 'sentences': len(parts)}
json.dump(info, open(f'tts-pilot/{lang}.json', 'w'))
print(info)
