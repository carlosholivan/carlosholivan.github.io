"""Pilot step 1 (Qwen3-TTS, Apache-2.0): design one synthetic voice per character from a text description (no real
person is cloned), then read the character's lines with that same voice (VoiceDesign -> Base clone prompt)."""
import json, os, torch, soundfile as sf
from qwen_tts import Qwen3TTSModel
P = json.load(open('pilot.json')); os.makedirs('out/ref', exist_ok=True); os.makedirs('out/qwen', exist_ok=True)
torch.manual_seed(7)
vd = Qwen3TTSModel.from_pretrained('Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign', device_map='cpu', dtype=torch.float32)
for c in P:
    # Arabic is not in Qwen3-TTS: design the voice reading an English line (Chatterbox then speaks Arabic with it)
    text, lang = (c['ref_text'], c['qlang']) if c['qlang'] else ('Hello! Today I will tell you a little story about my village.', 'English')
    wavs, sr = vd.generate_voice_design(text=text, language=lang, instruct=c['instruct'])
    sf.write(f"out/ref/{c['app']}-{c['who']}.wav", wavs[0], sr); c['ref_used'] = text
    print('designed', c['app'], c['who'], flush=True)
del vd
base = Qwen3TTSModel.from_pretrained('Qwen/Qwen3-TTS-12Hz-1.7B-Base', device_map='cpu', dtype=torch.float32)
for c in P:
    if not c['qlang']: continue
    prompt = base.create_voice_clone_prompt(ref_audio=f"out/ref/{c['app']}-{c['who']}.wav", ref_text=c['ref_used'], x_vector_only_mode=False)
    for k, t in enumerate(c['lines']):
        wavs, sr = base.generate_voice_clone(text=t, language=c['qlang'], voice_clone_prompt=prompt)
        sf.write(f"out/qwen/{c['app']}-{c['who']}-{k}.wav", wavs[0], sr)
    print('qwen lines', c['app'], c['who'], flush=True)
json.dump(P, open('out/pilot.json', 'w'), ensure_ascii=False, indent=1)
