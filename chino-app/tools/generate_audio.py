"""Pre-generates Mandarin audio (MP3) for every word, character, syllable and sentence the app can speak.

Usage:  pip install edge-tts && python tools/generate_audio.py [--voice zh-CN-XiaoxiaoNeural]
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
LEVELS = [f"hsk{n}" for n in range(1, 8)]
HAN = re.compile(r"[\u3400-\u9fff]")


def load(path):
    p = ROOT / path
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else []


def collect_texts():
    texts = set()
    for lv in LEVELS:
        texts.update(v["w"] for v in load(f"data/{lv}/vocab.json"))
        texts.update(h["c"] for h in load(f"data/{lv}/hanzi.json"))
        for tx in load(f"data/{lv}/texts.json"):
            # The reader speaks each paragraph without the "名字：" speaker labels.
            texts.update(re.sub(r"^[^：\n]{1,8}：", "", p, flags=re.M) for p in tx.get("paragraphs", []))
            texts.update(q["q"]["zh"] for q in tx.get("questions", []) if isinstance(q.get("q"), dict) and q["q"].get("zh"))
        for cat in load(f"data/{lv}/drills.json"):
            for it in cat.get("items", []):
                texts.add(it["q"].replace("___", it["o"][it["a"]]))
        for u in load(f"data/{lv}/units.json"):
            for ex in u.get("exercises", []):
                for k in ("answer", "text"):
                    if isinstance(ex.get(k), str): texts.add(ex[k])
                if ex.get("type") == "fill": texts.add(ex["sentence"].replace("___", ex["blank"]))
    for s in load("data/syllables.json"):
        texts.update(f["c"] for f in s["t"].values())
    # Example characters/words hard-coded in the pronunciation view.
    texts.update(re.findall(r"'([\u3400-\u9fff]{1,4})'", (ROOT / "js/views/pron.js").read_text(encoding="utf-8")))
    return sorted(t.strip() for t in texts if t and HAN.search(t))


def file_for(text):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:16] + ".mp3"


async def synth(text, path, voice, rate, sem):
    async with sem:
        for attempt in range(5):
            try:
                await edge_tts.Communicate(text, voice, rate=rate).save(str(path))
                if path.stat().st_size > 0: return True
            except Exception as e:  # network hiccups: retry with backoff
                if attempt == 4:
                    print(f"FAILED {text!r}: {e}", flush=True)
            path.unlink(missing_ok=True)
            await asyncio.sleep(2 ** attempt)
        return False


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="zh-CN-XiaoxiaoNeural")
    ap.add_argument("--rate", default="-15%")
    ap.add_argument("--jobs", type=int, default=12)
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    texts = collect_texts()
    todo = [(t, OUT / file_for(t)) for t in texts if not (OUT / file_for(t)).exists()]
    print(f"{len(texts)} texts, {len(todo)} to generate", flush=True)
    sem = asyncio.Semaphore(args.jobs)
    done = 0

    async def one(t, p):
        nonlocal done
        await synth(t, p, args.voice, args.rate, sem)
        done += 1
        if done % 500 == 0: print(f"{done}/{len(todo)}", flush=True)

    await asyncio.gather(*(one(t, p) for t, p in todo))
    index = {t: file_for(t) for t in texts if (OUT / file_for(t)).exists()}
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"index.json: {len(index)}/{len(texts)} entries", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
