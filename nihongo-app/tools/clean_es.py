"""Clean Spanish glosses coming from JMdict: drop the '(eng: escalator)' loanword-origin notes and keep any
Spanish words that were wrongly wrapped in them ('(eng: zumo)' → 'zumo')."""
import re

TAG = re.compile(r'\(\s*(eng|dut|fre|ger|por|lat|ita|rus|chi|spa|kor|ain|ara|gre|heb|hin|san|fil|tha|tib|may|epo|swe|nor|dan|fin|pol|cze|hun|mol|tur|per|urd|vie|ice|bur|khm|mon|grc|sla|scr|yid|alg|amh|chn|haw|kur|tah|tsn|est|geo|glg|gla|bnt|bra|cat|cha|hun|ind)\s*:\s*([^)]*)\)')


def clean_es(es, en=''):
    if not es:
        return es
    en_l = (en or '').lower().replace('-', ' ')
    en_stems = {t[:4] for t in re.findall(r'[a-z]+', en_l) if len(t) >= 4}

    def rep(m):
        inner = m.group(2).strip()
        words = [w for w in re.split(r'[,;]\s*', inner) if w]
        def english(w):
            wl = w.lower().replace('-', ' ')
            return wl in en_l or all(t in en_l for t in wl.split()) or any(t[:4] in en_stems for t in re.findall(r'[a-z]+', wl) if len(t) >= 4)
        keep = [w for w in words if not english(w)]
        return ', ' + ', '.join(keep) if keep else ''

    s = TAG.sub(rep, es)
    s = re.sub(r'\s+,', ',', s)
    s = re.sub(r'(,\s*){2,}', ', ', s)
    s = re.sub(r'^\s*,\s*|\s*,\s*$', '', s)
    s = re.sub(r'\s*,\s*;', ';', s)
    s = re.sub(r'\s+;', ';', s)
    s = re.sub(r'\s{2,}', ' ', s).strip()
    return s or (en or es)
