# English app — course sources and build tools

Everything in `data/` is generated from the sources here (translations are Spanish only):

| Source | Builder | Output |
|---|---|---|
| `vocab_src/<level>.txt` (CEFR-J 1.5 A1–B2, Octanove C1–C2, translated) | `build_course.py` | `data/<level>/vocab.json` |
| `units_src/<level>.txt` (lessons following the EOI syllabus) | `build_course.py` | `units.json`, `grammar.json` |
| `texts_src/<level>.txt` (original readings) + `texts_src/extra_gloss.txt` | `build_texts.py` (spaCy) | `texts.json` |
| `drills_src/<level>.txt` | `build_drills.py` | `drills.json` |
| (course sentences) | `build_examples.py`, `build_extra.py` | `examples.json`, `extra.json` |
| `synonym_notes.txt` | `build_synonyms.py` | `synonyms.json` |
| (vocabulary) | `build_topics.py` | `data/topics.json` |
| (everything) | `generate_audio.py` (GitHub workflow) | `data/audio/` |

Order: build_course → build_texts → build_drills → build_examples → build_extra → build_synonyms → build_topics.
`build_texts.py` needs `pip install spacy` and the `en_core_web_sm` model.

Word lists: CEFR-J Wordlist 1.5 (Tono Laboratory, TUFS — free for research and commercial use with citation) and
Octanove Vocabulary Profile C1/C2 1.0 (CC BY-SA 4.0). See `vocab_src/CEFRJ-README.md`.
