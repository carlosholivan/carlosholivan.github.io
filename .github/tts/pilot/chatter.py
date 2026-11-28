"""Pilot step 2 (Chatterbox Multilingual, MIT): the same characters and lines, cloned from the designed voice."""
import json, os, torch, torchaudio as ta
from chatterbox.mtl_tts import ChatterboxMultilingualTTS
P = json.load(open('out/pilot.json')); os.makedirs('out/chatter', exist_ok=True)
model = ChatterboxMultilingualTTS.from_pretrained(device='cpu')
for c in P:
    for k, t in enumerate(c['lines']):
        torch.manual_seed(7)
        wav = model.generate(t, language_id=c['lang'], audio_prompt_path=f"out/ref/{c['app']}-{c['who']}.wav", exaggeration=0.5, cfg_weight=0.5)
        ta.save(f"out/chatter/{c['app']}-{c['who']}-{k}.wav", wav, model.sr)
    print('chatterbox', c['app'], c['who'], flush=True)
