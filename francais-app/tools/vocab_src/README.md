# Vocabulary sources

`FLELex_TreeTagger_Beacco.tsv` — FLELex (Beacco version, TreeTagger POS), a graded lexicon of French for foreign learners
built from CEFR textbooks. Each lemma has the CEFR level at which it first appears.
© CENTAL, UCLouvain — licensed under CC BY-NC-SA 4.0 (https://cental.uclouvain.be/cefrlex/flelex/).
Please cite: François, Gala, Watrin & Fairon (2014), *FLELex: a graded lexical resource for French foreign learners*, LREC 2014;
Pintard & François (2020).

`a1.txt … c2.txt` — the app's word lists, derived from FLELex (filtered: proper names, tagging errors and very rare or
technical words were removed, each word kept at its lowest level) and translated into Spanish for this app.
Being an adaptation, these lists are shared under the same licence, CC BY-NC-SA 4.0.
Line format: `headword | Spanish`. Nouns carry their article (`le livre`, `la table`); for nouns starting with a vowel
the gender follows the headword (`l'école f`). Lines starting with `-` are dropped.
