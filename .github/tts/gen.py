"""Generates the new voice for one shard: Chatterbox Multilingual (CPU), one sentence at a time, each sentence
checked with Whisper (it must say what the text says, with a sensible duration) and retried up to twice.
Items that still fail keep their current audio. Output: out/<app>-app/data/audio/<file>.mp3 + out/done-<app>-<n>.json"""
import json, os, re, subprocess, sys, time, unicodedata, urllib.request
import torch, torchaudio

app, n = sys.argv[1], sys.argv[2]
LANG = {'espanol': 'es', 'english': 'en', 'francais': 'fr', 'deutsch': 'de', 'arabic': 'ar', 'nihongo': 'ja', 'chino': 'zh'}[app]
CJK = LANG in ('zh', 'ja')
MAX_CER = {'zh': 0.3, 'ja': 0.35, 'ar': 0.3}.get(LANG, 0.2)
CPS = {'es': 14, 'en': 14, 'fr': 14, 'de': 13, 'ar': 11, 'ja': 7, 'zh': 4.5}[LANG]
DEADLINE = time.time() + float(os.environ.get('TTS_MINUTES', '310')) * 60
items = json.load(open(f'shards/{app}-{n}.json', encoding='utf8'))
torch.set_num_threads(os.cpu_count() or 4)

from chatterbox.mtl_tts import ChatterboxMultilingualTTS
from faster_whisper import WhisperModel
tts = ChatterboxMultilingualTTS.from_pretrained('cpu')
asr = WhisperModel('small', device='cpu', compute_type='int8')
t2s = None
if LANG == 'zh':
    import opencc; t2s = opencc.OpenCC('t2s')

# Reference voice: a file in .github/tts/voices/<lang>.* if present, else the official demo prompt.
ref = None
for ext in ('wav', 'flac', 'mp3'):
    if os.path.exists(f'.github/tts/voices/{LANG}.{ext}'): ref = f'.github/tts/voices/{LANG}.{ext}'
# British English: Karen Savage (LibriVox, public domain), a 14 s excerpt after the LibriVox intro.
if not ref and LANG == 'en':
    try:
        urllib.request.urlretrieve('https://archive.org/download/mansfield_park_1104_librivox/mansfield_park_01_austen_64kb.mp3', '/tmp/en_src.mp3')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '62', '-t', '14', '-i', '/tmp/en_src.mp3', '-ac', '1', '-ar', '24000', '/tmp/ref_en.wav'], check=True)
        ref = '/tmp/ref_en.wav'
    except Exception as e:
        print('British reference not available, using the demo voice:', e)
if not ref:
    DEMO = {'ar': 'ar_f/ar_prompts2.flac', 'de': 'de_f1.flac', 'en': 'en_f1.flac', 'es': 'es_f1.flac', 'fr': 'fr_f1.flac', 'ja': 'ja/ja_prompts1.flac', 'zh': 'zh_f2.flac'}
    ref = f'/tmp/ref_{LANG}.flac'
    urllib.request.urlretrieve('https://storage.googleapis.com/chatterbox-demo-samples/mtl_prompts/' + DEMO[LANG], ref)


def sentences(text):
    parts = [p.strip() for p in re.split(r'(?<=[.!?。！？؟…])\s*', text) if p.strip()]
    out = []
    for p in parts:                       # very long sentences: also split at commas
        while len(p) > (90 if CJK else 260):
            cut = max(p.rfind(c, 0, 90 if CJK else 260) for c in (',', '，', '、', '،', ';', '；'))
            if cut < 10: break
            out.append(p[:cut + 1].strip()); p = p[cut + 1:].strip()
        if p: out.append(p)
    # Very short pieces ("Ja.", "Gut!") break the model's alignment check: glue them to a neighbour.
    short = 4 if CJK else 14
    merged = []
    for p in out:
        if merged and (len(p) < short or len(merged[-1]) < short): merged[-1] = merged[-1] + ' ' + p
        else: merged.append(p)
    return merged


def norm(s):
    s = unicodedata.normalize('NFKC', s).lower()
    if LANG == 'ar': s = re.sub('[ً-ْٰـ]', '', s).replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ى', 'ي')
    if t2s: s = t2s.convert(s)
    s = re.sub(r'[^\w\s]', ' ', s)
    return ''.join(s.split()) if CJK else ' '.join(s.split())


def cer(a, b):
    a, b = norm(a), norm(b)
    if not a: return 0.0
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i] + [0] * len(b)
        for j, cb in enumerate(b, 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb))
        prev = cur
    return prev[-1] / len(a)


def good(wav, text):
    dur = wav.shape[-1] / tts.sr
    exp = max(0.6, len(text) / CPS)
    if not (0.35 * exp <= dur <= 2.5 * exp + 1.0): return False, 9.0
    w16 = torchaudio.functional.resample(wav, tts.sr, 16000)[0].numpy()
    segs, _ = asr.transcribe(w16, language=LANG, beam_size=1, vad_filter=False, condition_on_previous_text=False)
    heard = ''.join(s.text for s in segs)
    c = cer(text, heard)
    return c <= MAX_CER, c


os.makedirs(f'out/{app}-app/data/audio', exist_ok=True)
pause = torch.zeros(1, int(tts.sr * 0.3))
done, failed, stats = [], [], {'audio_s': 0, 'tries': 0}
t0 = time.time()
for k, (text, fname) in enumerate(items):
    if time.time() > DEADLINE: print('time limit reached at item', k); break
    # Stop early if this language clearly does not work with the model (most of the first 15 items fail).
    if k == 15 and len(failed) >= 11: print('too many failures, stopping this shard'); break
    chunks, ok = [], True
    for sent in sentences(text):
        best = None
        for attempt in range(3):
            torch.manual_seed(1234 + attempt)
            stats['tries'] += 1
            try:
                wav = tts.generate(sent, language_id=LANG, audio_prompt_path=ref, exaggeration=0.5, cfg_weight=0.5, temperature=0.8)
            except Exception as e:
                print('generate error:', type(e).__name__, str(e)[:120], '|', sent[:60], flush=True)
                continue
            passed, c = good(wav, sent)
            if passed: best = wav; break
        if best is None: ok = False; break
        chunks += [best, pause]
    if not ok:
        failed.append(fname); continue
    wav = torch.cat(chunks[:-1], dim=-1)
    stats['audio_s'] += wav.shape[-1] / tts.sr
    torchaudio.save('/tmp/x.wav', wav, tts.sr)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', '/tmp/x.wav', '-ac', '1', '-ar', '16000', '-b:a', '16k',
                    f'out/{app}-app/data/audio/{fname}'], check=True)
    done.append(fname)
    if len(done) % 20 == 0: print(f'{len(done)} done, {len(failed)} failed, {time.time() - t0:.0f}s', flush=True)
stats.update(done=len(done), failed=len(failed), total=len(items), compute_s=round(time.time() - t0))
json.dump({'app': app, 'shard': n, 'files': done, 'failed': failed, 'stats': stats}, open(f'out/done-{app}-{n}.json', 'w'))
print(stats)
