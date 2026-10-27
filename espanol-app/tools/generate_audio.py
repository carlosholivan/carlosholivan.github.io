"""Pre-generates Spanish audio (MP3) for every word and sentence the app can speak.

Usage:  pip install edge-tts && python tools/generate_audio.py [--voice es-ES-ElviraNeural]
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
LEVELS = ["a1", "a2", "b1", "b2", "c1"]


# Fixed phrases spoken by the app UI (js/views/welcome.js).
UI_PHRASES = ["Encantado de tenerte de vuelta.", "Encantado de conocerte.", "¿Qué quieres estudiar hoy?",
              "¿Cuál es tu nivel de español?", "¡Cuánto tiempo! Te echábamos de menos."]
UI_PHRASES += [f"Hace {d} días que no te veíamos." for d in range(2, 30)]


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
            texts.update(v["word"] for v in u.get("newVocab", []))
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
    return sorted(t.strip() for t in texts if t and t.strip())


def spoken(text):
    """Text actually read aloud: drops English glosses and expands notation like bajo/a."""
    t = re.sub(r"\s*\([^)]*\)", "", text)
    if "=" in t:  # arithmetic, e.g. "Diez + ocho = dieciocho"
        t = t.replace("+", " más ").replace("=", " son ")
    t = t.replace("+", " ").replace("...", " ").replace("…", " ")
    t = re.sub(r"\b(\w+)o/a\b", r"\1o, \1a", t)
    t = re.sub(r"\b(\w+)/a\b", r"\1, \1a", t)
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
    ap.add_argument("--voice", default="es-ES-ElviraNeural")
    ap.add_argument("--rate", default="-10%")
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
