"""Pre-generates English audio (MP3, British voice) for every word and sentence the app can speak.

Usage:  pip install edge-tts && python tools/generate_audio.py [--voice en-GB-SoniaNeural]
Writes data/audio/<hash>.mp3 and data/audio/index.json ({text: file}). Re-run after editing
the course data; existing files are reused.
"""
import argparse
import asyncio
import hashlib
import json
import re
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "audio"
LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"]


# Fixed phrases spoken by the app UI (js/views/welcome.js).
UI_PHRASES = ["Great to see you again!", "Nice to meet you!", "What's your level of English?", "What's your name?",
              "What do you want to learn today?", "Hello, welcome!", "Hello!", "Long time no see! We've missed you.",
              "Hello! How are you? Let's learn English together."]
UI_PHRASES += [f"You haven't studied for {d} days." for d in range(2, 30)]


def collect_texts():
    texts = set(UI_PHRASES)
    for lv in LEVELS:
        if not (ROOT / f"data/{lv}/units.json").exists():
            continue
        tf = ROOT / f"data/{lv}/texts.json"
        if tf.exists():
            for tx in json.loads(tf.read_text(encoding="utf-8")):
                texts.update(tx["paragraphs"])
                texts.update(tx["difficult"])
        df = ROOT / f"data/{lv}/drills.json"
        if df.exists():
            for cat in json.loads(df.read_text(encoding="utf-8")):
                for it in cat["items"]:
                    texts.add(it["q"].replace("___", it["o"][it["a"]]))
        for v in json.loads((ROOT / f"data/{lv}/vocab.json").read_text(encoding="utf-8")):
            texts.add(v["word"])
        for u in json.loads((ROOT / f"data/{lv}/units.json").read_text(encoding="utf-8")):
            texts.update(v if isinstance(v, str) else v["word"] for v in u.get("newVocab", []))
            texts.update(u.get("vocab", []))
            for ex in u.get("exercises", []):
                t = ex["type"]
                if t == "fill":
                    texts.add(ex["sentence"].replace("___", ex["blank"]))
                elif t in ("order", "translate"):
                    texts.add(ex["answer"])
                elif t == "match":
                    texts.update(p[0] for p in ex["pairs"])
                elif t == "listen":
                    texts.add(ex["text"])
        # example sentences on the cards and the optional practice sets 2–7
        ef = ROOT / f"data/{lv}/examples.json"
        if ef.exists():
            for exs in json.loads(ef.read_text(encoding="utf-8")).values():
                texts.update(e[0] for e in exs)
        xf = ROOT / f"data/{lv}/extra.json"
        if xf.exists():
            for unit in json.loads(xf.read_text(encoding="utf-8")).values():
                for st in unit["sets"]:
                    for ex in st:
                        if ex["type"] == "fill":
                            texts.add(ex["sentence"].replace("___", ex["blank"]))
                        elif ex["type"] == "order":
                            texts.add(ex["answer"])
                        elif ex["type"] == "choose":
                            texts.add(ex["correct"])
    texts.update(verb_forms())
    return sorted(t.strip() for t in texts if t and t.strip())


def verb_forms():
    """Every form shown by the verbs page (js/conj.js), computed with node."""
    import subprocess
    code = f"""import('{(ROOT / 'js' / 'conj.js').as_uri()}').then(m => {{
      const out = new Set();
      for (const v of m.VERBS) {{
        out.add(v.w); for (const f of [m.pastOf(v), m.participle(v)]) String(f).split('/').forEach(x => out.add(x)); out.add(m.gerund(v));
        for (const t of m.TENSES) for (const p of [0,1,2,3,4,5]) {{ const f = m.conjugate(v, t.id, p); if (f && f !== '—') out.add(f); }}
        out.add("don't " + v.w); out.add("let's not " + v.w);
      }}
      console.log(JSON.stringify([...out]));
    }})"""
    try:
        r = subprocess.run(['node', '--input-type=module', '-e', code], capture_output=True, text=True, timeout=60)
        return json.loads(r.stdout)
    except Exception as e:
        print('verb forms not available:', e)
        return []


def spoken(text):
    """Text actually read aloud: drops glosses in brackets and the speaker names of dialogues stay."""
    t = re.sub(r"\s*\([^)]*\)", "", text)
    t = t.replace("...", " ").replace("…", " ").replace("/", ", ").replace("___", " ")
    return re.sub(r"\s+", " ", t).strip()


def file_for(text):
    return hashlib.sha1(spoken(text).encode("utf-8")).hexdigest()[:16] + ".mp3"


async def synth(text, path, voice, rate, sem):
    async with sem:
        for attempt in range(4):
            try:
                await edge_tts.Communicate(spoken(text), voice, rate=rate).save(str(path))
                return True
            except Exception as e:  # network hiccups: retry with backoff
                if attempt == 3:
                    print(f"FAILED {text!r}: {e}")
                    path.unlink(missing_ok=True)
                    return False
                await asyncio.sleep(2 ** attempt)


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="en-GB-SoniaNeural")
    ap.add_argument("--rate", default="-5%")
    ap.add_argument("--jobs", type=int, default=8)
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    texts = collect_texts()
    todo = [(t, OUT / file_for(t)) for t in texts if not (OUT / file_for(t)).exists()]
    print(f"{len(texts)} texts, {len(todo)} to generate")
    sem = asyncio.Semaphore(args.jobs)
    await asyncio.gather(*(synth(t, p, args.voice, args.rate, sem) for t, p in todo))

    index = {t: file_for(t) for t in texts if (OUT / file_for(t)).exists()}
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"index.json: {len(index)}/{len(texts)} entries")


if __name__ == "__main__":
    asyncio.run(main())
