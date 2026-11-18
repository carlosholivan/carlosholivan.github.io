"""Replaces the placeholder grammar blocks ('(punto N1)' …) of the lesson intros with real meaning, form and explanation."""
import json, re, html
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
P = {
 '～ようになる': ('llegar a (cambio)', 'come to (change)', 'V-dicc. / V-ない + ようになる', 'Cambio gradual de capacidad o de costumbre: antes no, ahora sí (o al revés con ～なくなる).', 'A gradual change in ability or habit: before not, now yes (or the opposite with ～なくなる).'),
 '～ことになる': ('se decide que; resulta que', 'it is decided that; it turns out that', 'V-dicc. / V-ない + ことになる', 'Una decisión tomada por otros o por las circunstancias (no por mí). ～ことにする es la decisión propia.', 'A decision made by others or by circumstances (not by me). ～ことにする is your own decision.'),
 '～うちに': ('mientras; antes de que', 'while; before', 'V-dicc. / V-ている / V-ない / Adj / N の + うちに', 'Hacer algo dentro de un periodo, antes de que la situación cambie (若いうちに, 雨が降らないうちに). Con ～ているうちに: sin darse cuenta, ocurrió algo.', 'Do something within a period, before the situation changes (若いうちに, 雨が降らないうちに). With ～ているうちに: something happened without noticing.'),
 '～さえ～ば': ('con solo que…, basta con', 'if only…, as long as', 'N + さえ + V-ば ・ V-ます + さえ + すれば', 'La única condición necesaria: si se cumple, basta (時間さえあれば, 薬を飲みさえすれば).', 'The only condition needed: if it is met, that is enough (時間さえあれば, 薬を飲みさえすれば).'),
 '～ことなしに': ('sin (hacer)', 'without (doing)', 'V-dicc. + ことなしに(は)', 'Versión escrita de ～ないで／～ずに. Con は + negativo: sin hacer A no es posible B.', 'Written version of ～ないで／～ずに. With は + negative: without A, B is impossible.'),
 '～ところを': ('a pesar de (en agradecimientos y disculpas)', 'despite (in thanks and apologies)', 'V / Adj / N の + ところを', 'Reconoce la situación del otro (estar ocupado, descansando) al agradecer o pedir perdón: お忙しいところを, お休みのところを.', 'Acknowledges the other person’s situation (busy, resting) when thanking or apologising: お忙しいところを, お休みのところを.'),
 '～なり': ('nada más (y entonces); a su manera; A o B', 'as soon as; in one’s own way; A or B', 'V-dicc. + なり ・ N + なりに ・ A なり B なり', 'Tres usos: V-dicc. + なり = nada más hacer A, ocurre B inesperado (sujeto en 3.ª persona). N なりに = a su manera. A なり B なり = A o B, sugiriendo opciones.', 'Three uses: V-dict + なり = as soon as A, unexpected B (third person). N なりに = in one’s own way. A なり B なり = A or B, suggesting options.'),
 '～ないまでも': ('aunque no llegue a…, al menos', 'even if not…, at least', 'V-ない + までも', 'Se renuncia a lo máximo pero se pide un mínimo: 毎日とは言わないまでも、週に一度は.', 'You give up on the maximum but ask for a minimum: 毎日とは言わないまでも、週に一度は.'),
 '～を限りに': ('a partir de (y ya no más)', 'as of (and no more)', 'N (今日, 今回…) + を限りに', 'Marca el último momento de algo que termina: 今日を限りに禁煙する, 今シーズンを限りに引退.', 'Marks the last moment of something that ends: 今日を限りに禁煙する, 今シーズンを限りに引退.'),
 '～といえども': ('aunque sea, incluso', 'even though, even', 'N / frase simple + といえども', 'Aunque se trate de N (de quien cabría esperar otra cosa), aun así…: 子どもといえども、法律は守るべきだ. Muy formal.', 'Even though it is N (from whom you’d expect otherwise), still…: 子どもといえども、法律は守るべきだ. Very formal.'),
 '～を皮切りに': ('empezando por', 'starting with', 'N + を皮切りに(して)', 'Lo primero de una serie que se extiende después: 東京公演を皮切りに全国ツアー.', 'The first of a series that then expands: 東京公演を皮切りに全国ツアー.'),
 '～がてら': ('aprovechando, de paso', 'while, on the way', 'N (散歩, 買い物…) / V-ます + がてら', 'Se hace una acción principal y de paso otra: 散歩がてら、パンを買う.', 'You do a main action and another one on the way: 散歩がてら、パンを買う.'),
 '～かたわら': ('además de, a la vez que', 'besides, alongside', 'V-dicc. / N の + かたわら', 'Actividad secundaria que se hace habitualmente junto a la principal (trabajo + afición): 会社に勤めるかたわら小説を書く.', 'A secondary activity done regularly alongside the main one (job + hobby): 会社に勤めるかたわら小説を書く.'),
 '～かたがた': ('con el doble fin de', 'with the twofold aim of', 'N (お礼, 報告, 挨拶…) + かたがた', 'Muy formal, en visitas y cartas: お礼かたがたご挨拶に伺います (a dar las gracias y saludar).', 'Very formal, in visits and letters: お礼かたがたご挨拶に伺います (to thank and greet).'),
 '～なしに': ('sin', 'without', 'N + なしに(は)', 'Sin N (que debería estar): 断りなしに入る. Con は + negativo: sin N no es posible.', 'Without N (which should be there): 断りなしに入る. With は + negative: without N it’s impossible.'),
 '～ともなると': ('cuando se llega a ser / a nivel de', 'once it comes to', 'N + ともなると／ともなれば', 'Al alcanzar una posición, edad o momento especial, la situación cambia: 社長ともなると忙しい, 年末ともなると.', 'At a special position, age or time, things change: 社長ともなると忙しい, 年末ともなると.'),
 '～まみれ': ('cubierto de, empapado de', 'covered in', 'N (泥, 汗, 血, ほこり) + まみれ', 'Cubierto de algo pegajoso o sucio por toda la superficie. だらけ = lleno de (más general).', 'Covered all over with something sticky or dirty. だらけ = full of (more general).'),
 '～とあれば': ('si es por, si se trata de', 'if it’s for, if it comes to', 'N / frase + とあれば', 'Si se da esa razón especial, se está dispuesto a hacer lo que sea: 子どものためとあれば.', 'Given that special reason, one is willing to do anything: 子どものためとあれば.'),
 '～とあって': ('como (es una situación especial)', 'because (it’s a special situation)', 'N / frase + とあって', 'Causa especial que explica lo que se observa: 連休とあって、どこも混んでいる.', 'A special cause explaining what is observed: 連休とあって、どこも混んでいる.'),
 '～と相まって': ('unido a, junto con', 'combined with', 'N + と相まって', 'Dos factores que se combinan y refuerzan el efecto: 努力が才能と相まって.', 'Two factors combining and reinforcing the effect: 努力が才能と相まって.'),
 '～にもまして': ('más aún que', 'even more than', 'N / 疑問詞 + にもまして', 'Más que N (que ya era mucho): 例年にもまして暑い. 何にもまして = por encima de todo.', 'More than N (which was already a lot): 例年にもまして暑い. 何にもまして = above all.'),
 '～にひきかえ': ('al contrario que, en contraste con', 'in contrast to', 'N / V・Adj + の + にひきかえ', 'Contraste fuerte entre dos cosas, con valoración (a menudo crítica): まじめな兄にひきかえ弟は.', 'A sharp contrast between two things, with judgement (often critical): まじめな兄にひきかえ弟は.'),
 'まま': ('tal cual, sin cambiar', 'as it is, unchanged', 'V-た / V-ない / Adj / N の + まま', 'El estado sigue igual mientras ocurre otra cosa: 靴を履いたまま, 言われるままに (dejándose llevar).', 'The state stays the same while something else happens: 靴を履いたまま, 言われるままに (going along with it).'),
 '～ゆえ': ('debido a, por (escrito)', 'because of (written)', 'N (の) / frase + ゆえ(に)', 'Causa en registro escrito o literario: 若さゆえの失敗, 貧しいがゆえに.', 'Cause in written or literary style: 若さゆえの失敗, 貧しいがゆえに.'),
 '～めく': ('empezar a parecer, tener aire de', 'take on the air of', 'N + めく／めいた', 'Adquirir rasgos de algo: 春めく (parecer primavera), 皮肉めいた言い方.', 'Take on features of something: 春めく (feel like spring), 皮肉めいた言い方.'),
 '～に足る': ('digno de, que merece', 'worthy of', 'V-dicc. / N + に足る', 'Tiene suficiente valor para ello: 信頼に足る人物, 読むに足る本. Negativo: ～に足りない.', 'Has enough value for it: 信頼に足る人物, 読むに足る本. Negative: ～に足りない.'),
 '～を禁じ得ない': ('no poder contener', 'can’t help (feeling)', 'N (涙, 怒り, 同情…) + を禁じ得ない', 'Una emoción surge sin poder evitarlo (formal): 涙を禁じ得ない.', 'An emotion arises that one can’t suppress (formal): 涙を禁じ得ない.'),
}
n = 0
for lv in ['n3', 'n2', 'n1']:
    up = ROOT / 'data' / lv / 'units.json'
    raw = up.read_text(encoding='utf8'); U = json.loads(raw)
    for u in U:
        gi = u.get('grammarIntro') or {}
        for li, lang in enumerate(('es', 'en')):
            h = gi.get(lang, '')
            if not h: continue
            parts = re.split(r'(?=<h3>)', h)
            for i, blk in enumerate(parts):
                m = re.match(r'<h3>(.*?)\s+—\s+\((?:punto|N\d point)[^)]*\)</h3>', blk)
                if not m or m.group(1) not in P: continue
                k = m.group(1); mes, men, form, ees, een = P[k]
                tail = blk[blk.index('<div class="gex">'):] if '<div class="gex">' in blk else ''
                lab = 'Forma' if lang == 'es' else 'Form'
                parts[i] = (f'<h3>{html.escape(k)} — {html.escape(mes if lang == "es" else men)}</h3>'
                            f'<p><b>{lab}:</b> <span class="zh">{html.escape(form)}</span></p><p>{html.escape(ees if lang == "es" else een)}</p>' + tail)
                n += li == 0
            gi[lang] = ''.join(parts)
    up.write_text(json.dumps(U, ensure_ascii=False, indent=1 if raw.startswith('[\n') else None), encoding='utf8')
print(n, 'blocks rewritten')
