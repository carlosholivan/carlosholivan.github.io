"""Pre-generates Japanese audio (MP3, free Microsoft Edge neural voice) for the words and sentences the app speaks.

Usage:  pip install edge-tts && python tools/generate_audio.py [--voice ja-JP-NanamiNeural]
Writes data/audio/<hash>.mp3 and data/audio/index.json ({text: file}); js/audio.js plays these first
(with the device voice / Gemini as fallback). Re-run after editing the course data: existing files are reused.
Run automatically by .github/workflows/audio.yml.
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
LEVELS = ["n5", "n4", "n3", "n2", "n1"]
SCRIPT = re.compile(r"[\u3040-\u30ff\u3400-\u9fff]")
SPEAKER = re.compile(r"^[^：\n]{1,8}：", re.M)      # "名前：" dialogue labels are not read (same as js/audio.js)


def load(path):
    p = ROOT / path
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else []


def plain(s):
    """Example sentences may be token lists ([[kanji, kana], 'は', …]): join the written forms."""
    if isinstance(s, list):
        return "".join(x[0] if isinstance(x, list) else x for x in s)
    return s


def key(text):
    return SPEAKER.sub("", str(text)).strip()


def collect():
    texts, reading = set(), {}
    for lv in LEVELS:
        for v in load(f"data/{lv}/vocab.json"):
            texts.add(v["w"])
            if v.get("r") and v["r"] != v["w"]:
                reading[v["w"]] = v["r"]          # a lone kanji word is read from its kana (方 → かた)
        for tx in load(f"data/{lv}/texts.json"):
            texts.update(tx.get("paragraphs", []))
        for cat in load(f"data/{lv}/drills.json"):
            for it in cat.get("items", []):
                texts.add(it["q"].replace("___", it["o"][it["a"]]))
        for u in load(f"data/{lv}/units.json"):
            for ex in u.get("exercises", []):
                for k in ("answer", "text", "correct"):
                    if isinstance(ex.get(k), str): texts.add(ex[k])
                if ex.get("type") == "fill": texts.add(ex["sentence"].replace("___", ex["blank"]))
        for x in (load(f"data/{lv}/extra.json") or {}).values():
            for ex in (e for st in x["sets"] for e in st):
                for k in ("answer", "correct"):
                    if isinstance(ex.get(k), str): texts.add(ex[k])
                if ex.get("type") == "fill": texts.add(ex["sentence"].replace("___", ex["blank"]))
        for exs in (load(f"data/{lv}/examples.json") or {}).values():
            texts.update(plain(e[0]) for e in exs)
    for exs in (load("data/examples.json") or {}).values():
        if isinstance(exs, list):
            texts.update(plain(e[0]) for e in exs if isinstance(e, list) and e)
    out = {}
    for t in texts:
        if not isinstance(t, str):
            continue
        k = key(t)
        if k and SCRIPT.search(k):
            out[k] = reading.get(k, k)
    return out                                       # {key shown/asked by the app: text actually synthesised}


def file_for(spoken):
    return hashlib.sha1(spoken.encode("utf-8")).hexdigest()[:16] + ".mp3"


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
    ap.add_argument("--voice", default="ja-JP-NanamiNeural")
    ap.add_argument("--rate", default="-10%")
    ap.add_argument("--jobs", type=int, default=12)
    ap.add_argument("--count", action="store_true", help="only print how many clips are missing")
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    texts = collect()
    todo = {s: OUT / file_for(s) for s in set(texts.values()) if not (OUT / file_for(s)).exists()}
    print(f"{len(texts)} texts, {len(todo)} to generate", flush=True)
    if args.count:
        return
    sem = asyncio.Semaphore(args.jobs)
    done = 0

    async def one(s, p):
        nonlocal done
        await synth(s, p, args.voice, args.rate, sem)
        done += 1
        if done % 500 == 0: print(f"{done}/{len(todo)}", flush=True)

    await asyncio.gather(*(one(s, p) for s, p in todo.items()))
    index = {k: file_for(s) for k, s in texts.items() if (OUT / file_for(s)).exists()}
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"index.json: {len(index)}/{len(texts)} entries", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
