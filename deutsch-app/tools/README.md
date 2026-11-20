# French app — course sources and build tools

Everything in `data/` is generated from the sources here (translations are Spanish only):

| Source | Builder | Output |
|---|---|---|
| `vocab_src/<level>.txt` (FLELex, Beacco version, translated) | `build_course.py` | `data/<level>/vocab.json` |
| `units_src/<level>.txt` (lessons following the EOI syllabus) | `build_course.py` | `units.json`, `grammar.json` |
| `texts_src/<level>.txt` (original readings) + `texts_src/extra_gloss.txt` | `build_texts.py` (spaCy + js/conj.js) | `texts.json` |
| `drills_src/<level>.txt` | `build_drills.py` | `drills.json` |
| (course sentences) | `build_examples.py`, `build_extra.py` | `examples.json`, `extra.json` |
| `synonym_notes.txt` | `build_synonyms.py` | `synonyms.json` |
| (vocabulary, by its Spanish meaning) | `build_topics.py` | `data/topics.json` |
| (everything) | `generate_audio.py` (GitHub workflow, voice fr-FR-DeniseNeural) | `data/audio/` |

Order: build_course → build_texts → build_drills → build_examples → build_extra → build_synonyms → build_topics.
`build_texts.py` needs `pip install spacy`, the `fr_core_news_lg` model and node (it conjugates with `js/conj.js`).

Word lists: FLELex (CENTAL, UCLouvain), CC BY-NC-SA 4.0 — see `vocab_src/README.md`. The derived lists in
`vocab_src/*.txt` are shared under the same licence. A1–B2 follow the FLELex levels; the FLELex C1/C2 lists are
noisy (many technical terms), so C1 and C2 were curated by hand from the candidates plus the EOI C1/C2 topics
(argumentation, law, media, literature, idioms).

Readings and exercises are original, except `texts_src/c2.txt` text 3 (Jean de La Fontaine, *Le Corbeau et le
Renard*, 1668, public domain). Only pre-1929 classics may be quoted.

Source conventions: nouns are written with their article (`le livre`, `la table`, `l'école f`); use the straight
apostrophe (') in every source file.
