#!/usr/bin/env python3
"""
Generates src/shared/gq-cards.js and src/shared/gq-cards.css from all widget
designs in designs/2 партия дизайнов/.
"""
import os
import re
import json
import zipfile
from bs4 import BeautifulSoup

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DESIGN_DIR = os.path.join(ROOT, 'designs', '2 партия дизайнов')
SCRATCH_DIR = r'C:\Users\arist\.gemini\antigravity\brain\d8010a06-2439-4180-98e6-4c8d3347d07a\scratch'
OUT_JS = os.path.join(ROOT, 'src', 'shared', 'gq-cards.js')
OUT_CSS = os.path.join(ROOT, 'src', 'shared', 'gq-cards.css')

SKIP_SELECTORS = {
    'html', 'body', '*', ':root', 'main', 'header', 'nav', 'aside', 'footer',
    'h1', 'p.lead', '.lead', '.stage', '.wrap', '.page', '.shell', '.topbar',
    '.controls', '.toolbar', '.grid', '.hero', '.side', '.sidebar', '.filters',
    '.toast', '.copy-btn', '.section-head', '.code-box', '.tabs', '.tab',
    '*,*::before,*::after', '*, ::before, ::after'
}

def strip_comments(css: str) -> str:
    return re.sub(r'/\*.*?\*/', '', css, flags=re.S)

def parse_css_blocks(css: str):
    """Parse top-level CSS into list of (header, body_or_None)."""
    css = strip_comments(css)
    blocks = []
    i = 0
    n = len(css)
    while i < n:
        while i < n and css[i].isspace():
            i += 1
        if i >= n:
            break
        if css[i] == '@':
            # check @import / @charset (ends with ;) vs @media/@keyframes/@supports (has {})
            j = i
            while j < n and css[j] not in '{;':
                j += 1
            if j >= n:
                break
            if css[j] == ';':
                # @import etc. skip
                i = j + 1
                continue
            hdr = css[i:j].strip()
            depth = 1
            k = j + 1
            while k < n and depth > 0:
                if css[k] == '{': depth += 1
                elif css[k] == '}': depth -= 1
                k += 1
            blocks.append((hdr, css[j+1:k-1]))
            i = k
        else:
            j = css.find('{', i)
            if j < 0:
                break
            hdr = css[i:j].strip()
            depth = 1
            k = j + 1
            while k < n and depth > 0:
                if css[k] == '{': depth += 1
                elif css[k] == '}': depth -= 1
                k += 1
            blocks.append((hdr, css[j+1:k-1]))
            i = k
    return blocks

def prefix_selector_list(sel_str: str, scope: str, extra_skip=()):
    parts = []
    # split on commas outside parens/brackets
    cur = []
    paren = 0
    brack = 0
    for ch in sel_str:
        if ch == '(': paren += 1
        elif ch == ')': paren = max(0, paren - 1)
        elif ch == '[': brack += 1
        elif ch == ']': brack = max(0, brack - 1)
        if ch == ',' and paren == 0 and brack == 0:
            parts.append(''.join(cur).strip())
            cur = []
        else:
            cur.append(ch)
    if cur:
        parts.append(''.join(cur).strip())

    out = []
    skip_set = SKIP_SELECTORS | set(extra_skip)
    for p in parts:
        if not p:
            continue
        pl = p.lower()
        if pl in skip_set or pl.startswith('body ') or pl.startswith('html ') or pl.startswith('.stage ') or pl.startswith('.wrap ') or pl.startswith('main ') or pl.startswith('.grid ') or pl.startswith('.hero '):
            continue
        if pl == ':root' or pl.startswith(':root['):
            out.append(scope)
        elif p.startswith(scope):
            out.append(p)
        else:
            out.append(f'{scope} {p}')
    return ', '.join(out)

def scope_css(css: str, scope: str, extra_skip=(), root_vars_to_scope=True) -> str:
    blocks = parse_css_blocks(css)
    res = []
    for hdr, body in blocks:
        hl = hdr.lower().strip()
        if hl.startswith('@keyframes') or hl.startswith('@-webkit-keyframes'):
            res.append(f'{hdr} {{\n{body}\n}}')
        elif hl.startswith('@media') or hl.startswith('@supports'):
            inner = scope_css(body, scope, extra_skip=extra_skip, root_vars_to_scope=False)
            if inner.strip():
                res.append(f'{hdr} {{\n{inner}\n}}')
        elif hl.startswith('@font-face') or hl.startswith('@page'):
            continue
        else:
            if (hl == ':root' or hl.startswith(':root[')) and not root_vars_to_scope:
                continue
            pref = prefix_selector_list(hdr, scope, extra_skip=extra_skip)
            if pref:
                res.append(f'{pref} {{{body}}}')
    return '\n'.join(res)

def read_file(path):
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        return f.read()

# ---------------------------------------------------------------------------
# Collect CSS blocks & Card Variant definitions
# ---------------------------------------------------------------------------
css_parts = []
variants = []  # list of dicts: { id, cat ('numeric'|'panax'), group, name, tpl_code }

css_parts.append("""/* Base safe reset for extra GameQuill cards */
.w.w-game[class*="v-"] img{max-width:100%}
.w.w-game[class*="v-"] a{text-decoration:none}
.w.w-game.tw-card,.w.w-game.tw-card *,.w.w-game.tw-card ::before,.w.w-game.tw-card ::after{
  box-sizing:border-box;
  border-width:0;
  border-style:solid;
  border-color:#27272a;
}
.w.w-game.tw-card p,.w.w-game.tw-card h1,.w.w-game.tw-card h2,.w.w-game.tw-card h3,.w.w-game.tw-card h4{margin:0}
.w.w-game.tw-card svg,.w.w-game.tw-card img{display:block}
""")

# ===========================================================================
# 1. GLM5 (15 files: 8 numeric + 7 panax)
# ===========================================================================
GLM_SPECS = [
    ('glm-paper', 'numeric', 'GLM5 · Минимал', 'Бумажный минимал (число)', 'widget-01-minimal-paper.html'),
    ('glm-dark', 'numeric', 'GLM5 · Минимал', 'Тёмный минимал (число)', 'widget-02-minimal-dark.html'),
    ('glm-swiss', 'numeric', 'GLM5 · Постеры', 'Швейцарский постер (число)', 'widget-03-swiss-poster.html'),
    ('glm-editorial', 'numeric', 'GLM5 · Постеры', 'Журнальный постер (число)', 'widget-05-editorial-poster.html'),
    ('glm-vertical', 'numeric', 'GLM5 · Постеры', 'Вертикальный постер (число)', 'widget-06-vertical-poster.html'),
    ('glm-crt', 'numeric', 'GLM5 · Ретро', 'CRT-терминал (число)', 'widget-08-crt-terminal.html'),
    ('glm-snes', 'numeric', 'GLM5 · Ретро', 'SNES-картридж (число)', 'widget-09-snes-cart.html'),
    ('glm-pixel', 'numeric', 'GLM5 · Ретро', 'Пиксельная ночь (число)', 'widget-10-pixel-night.html'),
    ('glm-panax-paper', 'panax', 'GLM5 · PANAX', 'Бумажный минимал (PANAX)', 'widget-01-panax-minimal-paper.html'),
    ('glm-panax-dark', 'panax', 'GLM5 · PANAX', 'Тёмный минимал (PANAX)', 'widget-02-panax-minimal-dark.html'),
    ('glm-panax-swiss', 'panax', 'GLM5 · PANAX', 'Швейцарский постер (PANAX)', 'widget-03-panax-swiss-poster.html'),
    ('glm-panax-editorial', 'panax', 'GLM5 · PANAX', 'Журнальный постер (PANAX)', 'widget-05-panax-editorial-poster.html'),
    ('glm-panax-vertical', 'panax', 'GLM5 · PANAX', 'Вертикальный постер (PANAX)', 'widget-06-panax-vertical-poster.html'),
    ('glm-panax-crt', 'panax', 'GLM5 · PANAX', 'CRT-терминал (PANAX)', 'widget-08-panax-crt-terminal.html'),
    ('glm-panax-snes', 'panax', 'GLM5 · PANAX', 'SNES-картридж (PANAX)', 'widget-09-panax-snes-cart.html'),
]

for vid, cat, grp, name, fn in GLM_SPECS:
    raw = read_file(os.path.join(DESIGN_DIR, 'glm5', fn))
    sm = re.search(r'<style[^>]*>(.*?)</style>', raw, re.S)
    css = sm.group(1) if sm else ''
    html = re.sub(r'<style[^>]*>.*?</style>', '', raw, flags=re.S).strip()
    css_parts.append(scope_css(css, f'.w.w-game.v-{vid}'))

    # Replace cover & title & meta
    html = html.replace('src="cover.jpg"', 'src="__COVER__"')
    html = html.replace('background-image:url(cover.jpg)', 'background-image:url(__COVER_URL__)')
    html = html.replace('background-image: url(cover.jpg)', 'background-image: url(__COVER_URL__)')
    html = html.replace('alt="Обложка: Elden Ring"', 'alt="__TITLE__"')
    html = html.replace('ELDEN RING', '__TITLE_UPPER__')
    html = html.replace('Elden Ring', '__TITLE__')
    html = html.replace('EldenRing', '__TITLE__')
    html = html.replace('2022 · FromSoftware · Bandai Namco Entertainment', '__META__')
    html = html.replace('2022 · FromSoftware · Bandai Namco', '__META__')
    html = html.replace('2022 // FromSoftware', '__META__')
    html = html.replace('FromSoftware · Bandai Namco', '__DEV_PUB__')
    html = html.replace('FromSoftware', '__DEV__')
    html = html.replace('2022', '__YEAR__')

    # Genres
    html = re.sub(
        r'(<div class="[^"]*genres[^"]*">).*?(</div>)',
        r'\1__GENRE_SPANS__\2',
        html,
        flags=re.S
    )
    # Numeric values in glm5
    html = html.replace('4.5<i>/5</i>', '__SCORE5__<i>/5</i>')
    html = html.replace('4.5<span>/5</span>', '__SCORE5__<span>/5</span>')
    html = html.replace('4.5', '__SCORE5__')
    html = html.replace('97<i>/100</i>', '__IGDB__<i>/100</i>')
    html = html.replace('97<span>/100</span>', '__IGDB__<span>/100</span>')
    html = re.sub(r'(<b>)97(</b>)', r'\1__IGDB__\2', html)
    html = html.replace('IGDB 97', 'IGDB __IGDB__')
    html = html.replace('93<i>%</i>', '__STEAM_NUM__<i>%</i>')
    html = html.replace('93<span>%</span>', '__STEAM_NUM__<span>%</span>')
    html = html.replace('93%', '__STEAM_PCT__')

    # Links
    html = re.sub(r'href="https://www\.backloggd\.com[^"]*"', 'href="__BL_URL__"', html)
    html = re.sub(r'href="https://store\.steampowered\.com[^"]*"', 'href="__STEAM_URL__"', html)
    html = re.sub(r'href="https://www\.igdb\.com[^"]*"', 'href="__IGDB_URL__"', html)
    html = re.sub(r'href="https://panaxgames\.com[^"]*"', 'href="__PANAX_URL__"', html)

    # PANAX verdict / reaction histogram in glm5
    if cat == 'panax':
        # replace the 6 column heights & percentages dynamically if paXX-col exists
        col_matches = list(re.finditer(r'<div class="(pa\d+-col)">.*?</div>\s*</div>|<div class="(pa\d+-col)">.*?</div>(?=\s*(?:<div class="pa\d+-col|</div>))', html, re.S))
        # Simpler: replace the 6 sample percentages 19.6%, 41.2%, 37.3%, 0.0%, 2.0%, 0.0% + heights + verdict text
        # Better: parse with BeautifulSoup to rebuild the 6 columns cleanly from __RX_HIST__? Even simpler: substitute percentages + bar heights + verdict!
        soup = BeautifulSoup(html, 'html.parser')
        hist = soup.find(class_=re.compile(r'pa\d+-hist|pa\d+-bars|pa\d+-rows|pa\d+-list'))
        if hist:
            cols = hist.find_all(recursive=False)
            if len(cols) == 6:
                cls_prefix = cols[0].get('class', [''])[0].split('-')[0]
                for idx, col in enumerate(cols):
                    val_el = col.find(class_=re.compile(r'val|pct'))
                    if val_el:
                        val_el.string = f'__RX_PCT_{idx}__'
                    bar_el = col.find('i')
                    if bar_el and bar_el.get('style'):
                        st = bar_el['style']
                        if 'height:' in st:
                            bar_el['style'] = re.sub(r'height:\s*[^;]+', f'height:__RX_REL_{idx}%', st)
                        elif 'width:' in st:
                            bar_el['style'] = re.sub(r'width:\s*[^;]+', f'width:__RX_PCT_RAW_{idx}%', st)
                    else:
                        tr = col.find(class_=re.compile(r'track'))
                        if tr and not tr.find('i'):
                            # add dynamic bar element!
                            fill_classes = ['f-gold', 'f-orange', 'f-purple', 'f-blue', 'f-grey', 'f-green']
                            new_i = soup.new_tag('i', **{'class': fill_classes[idx]})
                            is_horiz = 'rows' in ' '.join(hist.get('class', []))
                            prop = 'width' if is_horiz else 'height'
                            new_i['style'] = f'{prop}:__RX_REL_{idx}%'
                            tr.append(new_i)
                    # Replace emoji badge with real PANAX image badge? Keep emoji or use badge img cleanly:
                    bdg = col.find(class_=re.compile(r'badge'))
                    if bdg:
                        bdg.string = f'__RX_ICON_{idx}__'
                html = str(soup)
        html = re.sub(r'Круто(?=\s*</b>)', '__TOP1_NAME__', html)
        html = html.replace('98.1%', '__POS_PCT__%')
        html = html.replace('👍', '__TOP1_ICON__')

    variants.append({
        'id': vid, 'cat': cat, 'group': grp, 'name': name,
        'tw': False, 'raw_html': html
    })

# ===========================================================================
# 2. GPT (6 PANAX cards — excluding widget-02-duet which is already duet)
# ===========================================================================
GPT_SPECS = [
    ('gpt-halo', 'panax', 'GPT · PANAX', 'Halo (кольцо реакций)', 'widget-03-halo.html'),
    ('gpt-bars', 'panax', 'GPT · PANAX', 'Bars (спектральные полосы)', 'widget-04-bars.html'),
    ('gpt-poster', 'panax', 'GPT · PANAX', 'Poster (обложка + шкала)', 'widget-05-poster.html'),
    ('gpt-ticket', 'panax', 'GPT · PANAX', 'Ticket (билет с корешком)', 'widget-07-ticket.html'),
    ('gpt-editorial', 'panax', 'GPT · PANAX', 'Editorial Pro (редакционный)', 'widget-09-editorial.html'),
    ('gpt-capsule', 'panax', 'GPT · PANAX', 'Capsule (компактная капсула)', 'widget-10-capsule.html'),
]

for vid, cat, grp, name, fn in GPT_SPECS:
    raw = read_file(os.path.join(DESIGN_DIR, 'гпт', fn))
    sm = re.search(r'<style[^>]*>(.*?)</style>', raw, re.S)
    css = sm.group(1) if sm else ''
    soup = BeautifulSoup(raw, 'html.parser')
    art = soup.find('article', class_='pcard')
    scope = f'.w.w-game.v-{vid}'
    css_parts.append(scope_css(css, scope))
    # Replace base64 badge imgs with dynamic badge tokens in order, or map by tier label!
    tier_map = {'Легенда': 0, 'Круто': 1, 'Хорошо': 2, 'Норм': 3, 'Плохо': 4, 'Ужас': 5}
    for img in art.find_all('img'):
        src = img.get('src', '')
        if src.startswith('data:image/png'):
            # check parent text to identify tier index
            pt = img.parent.get_text(' ', strip=True) if img.parent else ''
            matched = next((idx for lbl, idx in tier_map.items() if lbl in pt), None)
            if matched is None and img.parent and img.parent.parent:
                pt2 = img.parent.parent.get_text(' ', strip=True)
                matched = next((idx for lbl, idx in tier_map.items() if lbl in pt2), None)
            img['src'] = f'__RX_BADGE_{matched if matched is not None else "TOP1"}__'
    # Replace cover SVG with real cover img inside poster/cover box!
    for cov_svg in art.select('svg.cover, .cover-wrap svg, .ticket-stub svg, .capsule-art svg, .ed-cover svg, .poster-art svg'):
        w_cls = ' '.join(cov_svg.get('class', []))
        new_img = soup.new_tag('img', src='__COVER__', alt='__TITLE__')
        if w_cls: new_img['class'] = w_cls
        new_img['style'] = 'width:100%;height:100%;object-fit:cover;display:block'
        cov_svg.replace_with(new_img)
    # Any SVG poster inside .art or .cover-box
    for cov_div in art.select('.poster-cover, .cover, .thumb, .t-cover, .cap-cover'):
        if cov_div.find('svg'):
            cov_div.clear()
            new_img = soup.new_tag('img', src='__COVER__', alt='__TITLE__')
            new_img['style'] = 'width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit'
            cov_div.append(new_img)
    # Genres
    gdiv = art.find(class_='genres')
    if gdiv:
        gdiv.clear()
        gdiv.append('__GENRE_SPANS__')
    html = str(art)
    html = html.replace('NEONREQUIEM', '__TITLE_UPPER__')
    html = html.replace('NeonRequiem', '__TITLE__')
    html = html.replace('Neon Requiem', '__TITLE__')
    html = html.replace('2025 <i>·</i> Voidline Studio <i>·</i> Nova Interactive', '__META_ITALIC__')
    html = html.replace('2025 · Voidline Studio · Nova Interactive', '__META__')
    html = html.replace('2025 · Voidline Studio', '__META__')
    html = html.replace('conic-gradient(#f3cb16 0% 19.6%, #f2a000 19.6% 60.8%, #bd55e9 60.8% 98.1%, #8ea6af 98.1% 100%)', '__CONIC_GRAD__')
    # Replace sample percentages (19.6%, 41.2%, 37.3%, 0%, 2%, 0.0%) and bar widths
    for idx, pct_str in enumerate(['19.6', '41.2', '37.3', '0.0', '2.0', '0.0']):
        html = html.replace(f'{pct_str}%', f'__RX_PCT_{idx}__')
    html = html.replace('width:41.2%', 'width:__RX_VAL_1__%').replace('--v:41.2%', '--v:__RX_VAL_1__%')
    html = html.replace('41.2%', '__TOP1_PCT__%')
    html = html.replace('href="#"', 'href="__PANAX_URL__"' )
    # Note: replace links pointing to panax or placeholder
    html = re.sub(r'href="(?:#|https://panaxgames\.com[^"]*)"', 'href="__PANAX_URL__"', html)
    # For halo ring conic gradient fallback
    html = re.sub(r'background:\s*conic-gradient\([^)]+\)', 'background:__CONIC_GRAD__', html)
    variants.append({
        'id': vid, 'cat': cat, 'group': grp, 'name': name,
        'tw': False, 'raw_html': html
    })

# ===========================================================================
# 3. Карточка игры — panaaxgames, 4 варианта.html (4 PANAX cards)
# ===========================================================================
p4_raw = read_file(os.path.join(DESIGN_DIR, 'Карточка игры — panaaxgames, 4 варианта.html'))
p4_css = re.search(r'<style[^>]*>(.*?)</style>', p4_raw, re.S).group(1)
p4_soup = BeautifulSoup(p4_raw, 'html.parser')
p4_names = [
    ('panax4-bars', 'Доминанта + мини-столбики', 'v1'),
    ('panax4-medal', 'Медаль + топ-3 строкой', 'v2'),
    ('panax4-gradient', 'Единая градиентная полоса', 'v3'),
    ('panax4-scale', 'Шкала с маркером', 'v4'),
]
for vid, name, cls in p4_names:
    art = p4_soup.find('article', class_=cls)
    scope = f'.w.w-game.v-{vid}'
    css_parts.append(scope_css(p4_css, scope))
    cov = art.find(class_='cover')
    if cov:
        cov.clear()
        im = p4_soup.new_tag('img', src='__COVER__', alt='__TITLE__')
        im['style'] = 'width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit'
        cov.append(im)
    tags = art.find(class_='tags')
    if tags:
        tags.clear()
        tags.append('__GENRE_SPANS__')
    html = str(art)
    html = html.replace('Neon Requiem', '__TITLE__')
    html = html.replace('2025 · Voidline Studio · Nova Interactive', '__META__')
    html = html.replace('href="#"', 'href="__PANAX_URL__"' )
    if cls == 'v1':
        html = html.replace('<span class="pill" style="--c:#f59e0b">Круто <b>41%</b></span>', '<span class="pill" style="--c:__TOP1_COLOR__">__TOP1_NAME__ <b>__TOP1_INT__%</b></span>')
        html = re.sub(r'<div class="mini"[^>]*>.*?</div>', '__PANAX4_MINI_BARS__', html, flags=re.S)
    elif cls == 'v2':
        html = re.sub(r'<div class="medal"[^>]*>.*?</div>\s*<div class="top3">.*?</div>', '__PANAX4_MEDAL_ROW__', html, flags=re.S)
    elif cls == 'v3':
        html = re.sub(r'<div class="strip"[^>]*>.*?</div>', '__PANAX4_STRIP__', html, flags=re.S)
    elif cls == 'v4':
        html = re.sub(r'<div class="scale"[^>]*>.*?</div>', '__PANAX4_SCALE__', html, flags=re.S)
    variants.append({
        'id': vid, 'cat': 'panax', 'group': 'PANAX · 4 варианта', 'name': name,
        'tw': False, 'raw_html': html
    })

# ===========================================================================
# 4. Kimi ZIP (10 Numeric cards)
# ===========================================================================
with zipfile.ZipFile(os.path.join(DESIGN_DIR, 'Kimi_Agent_Game Review Widget Design.zip')) as z:
    kimi_css = z.read('app/src/styles.css').decode('utf-8', 'replace')
    kimi_js = z.read('app/src/main.js').decode('utf-8', 'replace')

kimi_css_scoped = scope_css(kimi_css, '.w.w-game.kimi-scope')
css_parts.append(kimi_css_scoped)

KIMI_IDS = [
    ('v1', 'kimi-editorial', 'Журнальная врезка'),
    ('v2', 'kimi-swiss', 'Швейцарская сетка'),
    ('v3', 'kimi-terminal', 'Терминал'),
    ('v4', 'kimi-ticket', 'Билет в игру'),
    ('v5', 'kimi-cinema', 'Кинокадр'),
    ('v6', 'kimi-inline', 'Одной строкой'),
    ('v7', 'kimi-brutal', 'Нео-брутализм'),
    ('v8', 'kimi-poster', 'Синий постер'),
    ('v9', 'kimi-dock', 'Рейтинговый док'),
    ('v10', 'kimi-cartridge', 'Картридж'),
]

for kid, vid, name in KIMI_IDS:
    m = re.search(rf"id:\s*'{kid}',.*?html:\s*`(.*?)`\s*\}}", kimi_js, re.S)
    if not m:
        raise RuntimeError(f'Missing kimi {kid}')
    html = m.group(1)
    html = html.replace('${cover}', '__COVER__')
    html = html.replace('${score}', '__SCORE10__')
    html = html.replace('${sourceLink}', '__SCORE_SRC__')
    html = html.replace('${gameMeta}', '__META_LINE__')
    html = html.replace('./cover.svg', '__COVER__').replace('./scene.svg', '__COVER__')
    html = html.replace('NEON_REQUIEM', '__TITLE_UPPER__').replace('NEON REQUIEM', '__TITLE_UPPER__')
    html = html.replace('NEONREQUIEM', '__TITLE_UPPER__').replace('NeonRequiem', '__TITLE__').replace('Neon Requiem', '__TITLE__')
    html = html.replace('Voidline Studio', '__DEV__')
    html = html.replace('2025', '__YEAR__')
    html = html.replace('Action RPG · Cyberpunk · Open world', '__GENRES_DOT__')
    html = html.replace('Action RPG / Cyberpunk / Open world', '__GENRES_SLASH__')
    html = html.replace('Action RPG', '__GENRE_0__').replace('Cyberpunk', '__GENRE_1__').replace('Open world', '__GENRE_2__')
    html = html.replace('<span class="source-name">Backloggd</span>', '<span class="source-name">__SCORE_SRC__</span>')
    html = html.replace('Backloggd', '__SCORE_SRC__')
    html = html.replace('8.4', '__SCORE10__')
    html = html.replace('84%', '__SCORE_PCT__')
    html = html.replace('████████░░', '__ASCII_BAR__')
    html = html.replace('179.4 213.6', '__DOCK_DASH__')
    html = html.replace('width: 84%', 'width: __SCORE_PCT_NUM__%')
    html = re.sub(r'href="https://backloggd\.com[^"]*"', 'href="__PANAX_URL__"', html)
    variants.append({
        'id': vid, 'cat': 'numeric', 'group': 'Kimi · 10 характеров', 'name': name,
        'tw': False, 'extra_cls': 'kimi-scope', 'raw_html': html
    })

# ===========================================================================
# 5. Sonnet: 10 PANAX + 27 Numeric (5 files)
# ===========================================================================
SON_PANAX_FILE = os.path.join(DESIGN_DIR, 'соннет', 'panaaxgames — распределение как герой (10).html')
sp_raw = read_file(SON_PANAX_FILE)
sp_css = re.search(r'<style[^>]*>(.*?)</style>', sp_raw, re.S).group(1)
css_parts.append('.w.w-game.son-p-scope{--bg:#121214;--fg:#eceae6;--mut:#8f8c86;--c1:#f5c800;--c2:#f59e0b;--c3:#b565f5;--c4:#38bdf8;--c5:#8fa3b8;--c6:#e34d68}\n' + scope_css(sp_css, '.w.w-game.son-p-scope'))
sp_soup = BeautifulSoup(sp_raw, 'html.parser')
SP_META = [
    ('h1', 'son-spectrum', 'Спектр (PANAX)'),
    ('h2', 'son-waffle', 'Вафля 10×10 (PANAX)'),
    ('h3', 'son-wave', 'Волна оценок (PANAX)'),
    ('h4', 'son-bignum', 'Гигантская цифра (PANAX)'),
    ('h5', 'son-mood', 'Шкала настроения (PANAX)'),
    ('h6', 'son-popart', 'Поп-арт (PANAX)'),
    ('h7', 'son-orbit', 'Орбита (PANAX)'),
    ('h8', 'son-segments', 'Прогресс-сегменты (PANAX)'),
    ('h9', 'son-podium', 'Подиум (PANAX)'),
    ('h10', 'son-tiles', 'Плитки реакций (PANAX)'),
]
for cls, vid, name in SP_META:
    art = sp_soup.find('article', class_=cls)
    html = str(art)
    html = html.replace('Neon Requiem', '__TITLE__')
    html = html.replace('href="#"', 'href="__PANAX_URL__"' )
    if cls == 'h1':
        html = re.sub(r'<div style="display:flex;justify-content:space-between;.*?</div>\s*<div class="sp">.*?</div>\s*<div class="lg">.*?</div>', '__SON_H1_BODY__', html, flags=re.S)
    elif cls == 'h2':
        html = html.replace('<div class="wf" id="w2"></div>', '<div class="wf">__SON_WAFFLE__</div>')
        html = html.replace('<div class="lvl" style="--c:var(--c2)">Круто · 41%</div>', '<div class="lvl" style="--c:__TOP1_COLOR__">__TOP1_NAME__ · __TOP1_INT__%</div>')
    elif cls == 'h3':
        html = re.sub(r'<svg.*?</svg>', '__SON_H3_SVG__', html, flags=re.S)
    elif cls == 'h4':
        html = re.sub(r'<div class="big">.*?</div>', '<div class="big" style="color:__TOP1_COLOR__">__TOP1_INT__<small>%</small></div>', html, flags=re.S)
        html = html.replace('Круто · Легенда 20 · Хорошо 37', '__TOP1_NAME__ · __SON_TOP_SUMMARY__')
    elif cls == 'h5':
        html = re.sub(r'<div class="dot"[^>]*></div>', '<div class="dot" style="left:__POS_INT__%"></div>', html)
        html = html.replace('<b>Круто</b> · 41%', '<b>__TOP1_NAME__</b> · __TOP1_INT__%')
    elif cls == 'h6':
        html = re.sub(r'<div class="bg"[^>]*>.*?</div>', '<div class="bg">__TOP1_NAME__ __TOP1_INT__% · __TOP2_NAME__ __TOP2_INT__%</div>', html, flags=re.S)
        html = html.replace('Круто · 41%', '__TOP1_NAME__ · __TOP1_INT__%')
    elif cls == 'h7':
        html = re.sub(r'<svg.*?</svg>', '__SON_ORBIT_SVG__', html, flags=re.S)
        html = html.replace('41%', '__TOP1_INT__%').replace('Круто', '__TOP1_NAME__')
    elif cls == 'h8':
        html = re.sub(r'<div class="seg"[^>]*>.*?</div>', '__SON_SEGMENTS__', html, flags=re.S)
    elif cls == 'h9':
        html = re.sub(r'<div class="pd"[^>]*>.*?</div>(?=\s*<a class="btn")', '__SON_PODIUM__', html, flags=re.S)
    elif cls == 'h10':
        html = re.sub(r'<div class="tl"[^>]*>.*?</div>(?=\s*<a class="btn")', '__SON_TILES__', html, flags=re.S)
    variants.append({
        'id': vid, 'cat': 'panax', 'group': 'Sonnet · PANAX (10)', 'name': name,
        'tw': False, 'extra_cls': 'son-p-scope', 'raw_html': html
    })

# Sonnet Numeric files (A-AA)
SON_NUM_FILES = [
    ('Виджеты игр для обзоров.html', 'son-num-1', [
        ('wa', 'son-a', 'A · Стеклянный постер'),
        ('wb', 'son-b', 'B · Редакторская карточка'),
    ]),
    ('Виджеты игр — ещё 5 вариантов.html', 'son-num-2', [
        ('wc', 'son-c', 'C · Терминал'),
        ('wd', 'son-d', 'D · Коллекционная карточка'),
        ('we', 'son-e', 'E · Строка в тексте'),
        ('wf', 'son-f', 'F · Нео-брутализм'),
        ('wg', 'son-g', 'G · Кинобаннер'),
    ]),
    ('Виджеты игр — ещё 10 вариантов.html', 'son-num-3', [
        ('wh', 'son-h', 'H · VHS-кассета'),
        ('wi', 'son-i', 'I · Минимал + большая цифра'),
        ('wj', 'son-j', 'J · Капсула магазина'),
        ('wk', 'son-k', 'K · Журнальный разворот'),
        ('wl', 'son-l', 'L · Полароид'),
        ('wm', 'son-m', 'M · 8-bit пиксель'),
        ('wn', 'son-n', 'N · Светлый глассморфизм'),
        ('wo', 'son-o', 'O · Лента в углу'),
        ('wp', 'son-p', 'P · Круговой рейтинг'),
        ('wq', 'son-q', 'Q · Полоса оценки'),
    ]),
    ('Виджеты игр — ещё 10 вариантов (R–AA).html', 'son-num-4', [
        ('wr', 'son-r', 'R · Стикер'),
        ('ws', 'son-s', 'S · Кредитка'),
        ('wt', 'son-t', 'T · Билет'),
        ('wu', 'son-u', 'U · Геймпад'),
        ('wv', 'son-v', 'V · Спидометр'),
        ('ww', 'son-w', 'W · Киноплёнка'),
        ('wx', 'son-x', 'X · Глитч'),
        ('wy', 'son-y', 'Y · Неон'),
        ('wz', 'son-z', 'Z · Таблица'),
        ('waa', 'son-aa', 'AA · Медаль'),
    ]),
]

for fn, scope_cls, items in SON_NUM_FILES:
    raw = read_file(os.path.join(DESIGN_DIR, 'соннет', fn))
    css = re.search(r'<style[^>]*>(.*?)</style>', raw, re.S).group(1)
    css_parts.append(f'.w.w-game.{scope_cls}{{--bg:#121214;--fg:#eceae6;--mut:#8f8c86;--card:#1b1c22}}\n' + scope_css(css, f'.w.w-game.{scope_cls}'))
    soup = BeautifulSoup(raw, 'html.parser')
    for cls, vid, name in items:
        el = soup.find(class_=cls)
        if not el:
            raise RuntimeError(f'Missing sonnet numeric {cls} in {fn}')
        cov = el.find(class_='cov') or el.find(class_='cover')
        if cov and cov.name != 'img':
            cov.clear()
            im = soup.new_tag('img', src='__COVER__', alt='__TITLE__')
            im['style'] = 'width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit'
            cov.append(im)
        tags = el.find(class_='tags')
        if tags:
            tags.clear()
            tags.append('__GENRE_SPANS__')
        html = str(el)
        html = html.replace('NEON REQUIEM', '__TITLE_UPPER__').replace('Neon Requiem', '__TITLE__')
        html = html.replace('Voidline Studio · Nova Interactive', '__DEV_PUB__').replace('Voidline Studio', '__DEV__')
        html = html.replace('2025', '__YEAR__')
        html = html.replace('Backloggd', '__SCORE_SRC__').replace('panaaxgames', '__SCORE_SRC__')
        html = html.replace('8.4', '__SCORE10__').replace('8.7', '__SCORE10__')
        html = html.replace('84%', '__SCORE_PCT__').replace('84', '__SCORE_PCT_NUM__')
        html = html.replace('href="#"', 'href="__PANAX_URL__"' )
        variants.append({
            'id': vid, 'cat': 'numeric', 'group': 'Sonnet · A–AA (27)', 'name': name,
            'tw': False, 'extra_cls': scope_cls, 'raw_html': html
        })

# ===========================================================================
# 6 & 7. Qwen 1 (10 PANAX) + Qwen 2 (12 Numeric) — extract CSS directly!
# ===========================================================================
q1_raw = read_file(os.path.join(DESIGN_DIR, '10 от квена.txt'))
q1_css = re.search(r'<style[^>]*>(.*?)</style>', q1_raw, re.S).group(1)
css_parts.append('.w.w-game.qwen1-scope{--accent:#7c5cff;--line:rgba(255,255,255,.1)}\n' + scope_css(q1_css, '.w.w-game.qwen1-scope'))

q2_raw = read_file(os.path.join(DESIGN_DIR, 'еще 10 от квена.txt'))
q2_css = re.search(r'<style[^>]*>(.*?)</style>', q2_raw, re.S).group(1)
css_parts.append('.w.w-game.qwen2-scope{--accent:#7c5cff}\n' + scope_css(q2_css, '.w.w-game.qwen2-scope'))

# ===========================================================================
# 8 & 9. Tailwind Cards: tw10 (10 PANAX) + tw32 (32 Numeric)
# ===========================================================================
tw10_dom = read_file(os.path.join(SCRATCH_DIR, 'tw10.html'))
tw32_dom = read_file(os.path.join(SCRATCH_DIR, 'tw32.html'))

tw10_styles = re.findall(r'<style[^>]*>(.*?)</style>', tw10_dom, re.S)
tw32_styles = re.findall(r'<style[^>]*>(.*?)</style>', tw32_dom, re.S)

# Custom CSS from both
css_parts.append('.w.w-game.tw-card{font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:#f5f3ef;--stone-bg:#e8e4dc;--paper-card:#f6f3ec;--ink-black:#141413;--signal-orange:#ff4f00;--acid-lime:#c8f904}\n')
css_parts.append(scope_css(tw10_styles[0], '.w.w-game.tw-card'))
css_parts.append(scope_css(tw32_styles[0], '.w.w-game.tw-card'))

# Extract Tailwind utilities from both (everything from .pointer-events-none onward) + merge deduplicated rules
def extract_tw_utils(tw_css: str) -> str:
    idx = tw_css.find('.pointer-events-none')
    if idx < 0:
        idx = tw_css.find('.fixed')
    utils = tw_css[idx:] if idx > 0 else tw_css
    return scope_css(utils, '.w.w-game.tw-card', root_vars_to_scope=False)

# Grab --tw-* variable init rule
tw_vars_m = re.match(r'\*, ::before, ::after\{([^}]+)\}', tw32_styles[1])
if tw_vars_m:
    css_parts.append('.w.w-game.tw-card, .w.w-game.tw-card *, .w.w-game.tw-card ::before, .w.w-game.tw-card ::after{' + tw_vars_m.group(1) + '}')
# Merge both Tailwind utility outputs by deduplicating lines
tw_u1 = extract_tw_utils(tw10_styles[1]).splitlines()
tw_u2 = extract_tw_utils(tw32_styles[1]).splitlines()
seen_tw = set()
tw_merged = []
for line in tw_u1 + tw_u2:
    if line not in seen_tw:
        seen_tw.add(line)
        tw_merged.append(line)
css_parts.append('\n'.join(tw_merged))

# Parse 10 PANAX Tailwind widgets (w1..w10)
tw10_soup = BeautifulSoup(tw10_dom, 'html.parser')
TW10_NAMES = [
    ('twp-1', 'Полоса эмоций + медаль'),
    ('twp-2', 'Эквалайзер Panax'),
    ('twp-3', 'Кольцевая диаграмма'),
    ('twp-4', 'Бумажный билет-клавиши'),
    ('twp-5', 'Подиум Топ-3 реакций'),
    ('twp-6', 'Широкий кадр + лента'),
    ('twp-7', 'Терминал ASCII-гистограмма'),
    ('twp-8', 'Швейцарская таблица'),
    ('twp-9', 'Волна мнений'),
    ('twp-10', 'Компактная строка PANAX'),
]
for idx, (vid, name) in enumerate(TW10_NAMES, 1):
    box = tw10_soup.find(id=f'w{idx}')
    # Remove id attributes on elements except waveGrad gradient
    for el in [box] + box.find_all(True):
        eid = el.get('id', '')
        if not eid:
            continue
        if eid == f'w{idx}-poster' or eid == f'w{idx}-art':
            el.clear()
            im = tw10_soup.new_tag('img', src='__COVER__', alt='__TITLE__')
            im['class'] = 'w-full h-full object-cover'
            el.append(im)
        elif eid == f'w{idx}-title':
            el.string = '__TITLE__'
        elif eid == f'w{idx}-dev':
            el.string = '__META__'
        elif eid == f'w{idx}-bar':
            el.clear(); el.append('__TWP_W1_BAR__')
        elif eid == f'w{idx}-legend':
            el.clear(); el.append('__TWP_W1_LEGEND__')
        elif eid == f'w{idx}-leader-name':
            el.string = '__TOP1_LABEL__'
            el['style'] = 'color:__TOP1_COLOR__'
        elif eid == f'w{idx}-leader-pct':
            el.string = '__TOP1_PCT__% игроков'
        elif eid == f'w{idx}-leader-icon':
            el.clear(); el.append('__TOP1_BADGE_IMG_36__')
        elif eid == f'w{idx}-pillars':
            el.clear(); el.append('__TWP_W2_PILLARS__')
        elif eid == f'w{idx}-donut':
            st = el.get('style', '')
            el['style'] = re.sub(r'background:\s*conic-gradient\([^;]+', 'background:__CONIC_GRAD__', st)
        elif eid == f'w{idx}-center-pct':
            el.string = '__TOP1_PCT__%'
        elif eid == f'w{idx}-center-lbl':
            el.string = '__TOP1_LABEL__'
        elif eid == f'w{idx}-list':
            el.clear(); el.append('__TWP_W3_LIST__')
        elif eid == f'w{idx}-leader':
            el.clear(); el.append('__TWP_W4_LEADER__')
        elif eid == f'w{idx}-keys':
            el.clear(); el.append('__TWP_W4_KEYS__')
        elif eid == f'w{idx}-podium':
            el.clear(); el.append('__TWP_W5_PODIUM__')
        elif eid == f'w{idx}-rest':
            el.clear(); el.append('__TWP_W5_REST__')
        elif eid == f'w{idx}-cells':
            el.clear(); el.append('__TWP_W6_CELLS__')
        elif eid == f'w{idx}-rows':
            el.clear(); el.append('__TWP_W7_ROWS__')
        elif eid == f'w{idx}-table':
            el.clear(); el.append('__TWP_W8_TABLE__')
        elif eid == f'w{idx}-labels':
            el.clear(); el.append('__TWP_W9_LABELS__')
        elif eid == f'w{idx}-mini-bar':
            el.clear(); el.append('__TWP_W10_BAR__')
        elif eid == f'w{idx}-badge':
            el.string = '__TOP1_LABEL__ · __TOP1_PCT__%'
            st = el.get('style', '')
            if 'color:' in st:
                el['style'] = re.sub(r'color:[^;]+', 'color:__TOP1_COLOR__', st)
        if eid != 'waveGrad':
            del el['id']
    for a in box.find_all('a'):
        a['href'] = '__PANAX_URL__'
    html = str(box)
    html = html.replace('Neon Requiem', '__TITLE__').replace('2025 · Voidline Studio', '__META__')
    variants.append({
        'id': vid, 'cat': 'panax', 'group': 'Panax Tailwind (10)', 'name': name,
        'tw': True, 'raw_html': html
    })

# Parse 32 Numeric Tailwind widgets (widget-v1-root..widget-v32-root)
tw32_soup = BeautifulSoup(tw32_dom, 'html.parser')
TW32_TITLES = []
for sec in tw32_soup.select('section[id^="sec-v"]'):
    h2 = sec.find('h2')
    t = h2.get_text(' ', strip=True) if h2 else sec.get('id')
    t = re.sub(r'^«([^»]+)».*$', r'\1', t).strip()
    TW32_TITLES.append(t[:46])

for idx in range(1, 33):
    vid = f'tw32-{idx}'
    name = TW32_TITLES[idx-1] if idx-1 < len(TW32_TITLES) else f'Дизайн #{idx}'
    box = tw32_soup.find(id=f'widget-v{idx}-root')
    for el in [box] + box.find_all(True):
        eid = el.get('id', '')
        if not eid:
            continue
        if eid in (f'v{idx}-poster', f'v{idx}-widescreen-art', f'v{idx}-bg-art'):
            el.clear()
            im = tw32_soup.new_tag('img', src='__COVER__', alt='__TITLE__')
            im['class'] = 'w-full h-full object-cover'
            el.append(im)
        elif eid == f'v{idx}-title':
            el.string = '__TITLE__'
        elif eid in (f'v{idx}-dev', f'v{idx}-dev-text', f'v{idx}-studio', f'v{idx}-year-dev'):
            el.string = '__META__'
        elif eid == f'v{idx}-dev-year':
            el.string = '__META__'
        elif eid == f'v{idx}-dev-genres':
            el.string = '__META__ · __GENRES_DOT__'
        elif eid in (f'v{idx}-year', f'v{idx}-year-badge'):
            el.string = '__YEAR__'
        elif eid == f'v{idx}-genres':
            el.clear(); el.append('__GENRE_SPANS__')
        elif eid in (f'v{idx}-score-main', f'v{idx}-primary-score-val', f'v{idx}-score1-val'):
            el.string = '__SCORE10__'
        elif eid in (f'v{idx}-score-igdb', f'v{idx}-score2-val', f'v{idx}-igdb-score-val'):
            el.string = '__IGDB__'
        elif eid in (f'v{idx}-score-steam', f'v{idx}-score3-val'):
            el.string = '__STEAM_PCT__'
        elif eid == f'v{idx}-steam-mini':
            el.string = '__STEAM_PCT__ ПОЛОЖИТ.'
        elif eid in (f'v{idx}-primary-score-label', f'v{idx}-plat-label', f'v{idx}-plat-name', f'v{idx}-plat-badge', f'v{idx}-plat-tag', f'v{idx}-plat-short', f'v{idx}-source-header', f'v{idx}-platform-badge'):
            if 'short' in eid:
                el.string = 'PX'
            else:
                el.string = '__SCORE_SRC__'
        elif eid in (f'v{idx}-links', f'v{idx}-links-bar'):
            el.clear(); el.append('__TW32_LINKS__')
        elif eid == f'v{idx}-ascii-main':
            el.string = '__ASCII_BAR__'
        elif eid == f'v{idx}-ascii-igdb':
            el.string = '__ASCII_IGDB__'
        elif eid == f'v{idx}-ascii-steam':
            el.string = '__ASCII_STEAM__'
        elif eid in (f'v{idx}-primary-bar', f'v{idx}-bar-main'):
            st = el.get('style', '')
            el['style'] = re.sub(r'width:[^;]+', 'width:__SCORE_PCT_NUM__%', st)
        elif eid in (f'v{idx}-igdb-bar', f'v{idx}-bar-igdb'):
            st = el.get('style', '')
            el['style'] = re.sub(r'width:[^;]+', 'width:__IGDB__%', st)
        elif eid == f'v{idx}-bar-steam':
            st = el.get('style', '')
            el['style'] = re.sub(r'width:[^;]+', 'width:__STEAM_NUM__%', st)
        elif eid == f'v{idx}-verdict-text' or eid == f'v{idx}-verdict' or eid == f'v{idx}-steam-desc':
            pass
        if eid not in ('cineNeonBg', 'cineSun', 'neonBg', 'neonSun'):
            del el['id']
    # Replace remaining hardcoded strings & SVG posters inside box
    html = str(box)
    html = html.replace('NEON REQUIEM', '__TITLE_UPPER__').replace('Neon Requiem', '__TITLE__')
    html = html.replace('Voidline Studio · Nova Interactive', '__DEV_PUB__').replace('Voidline Studio', '__DEV__')
    html = re.sub(r'href="(?:#[^"]*)?"', 'href="__PANAX_URL__"' , html)
    variants.append({
        'id': vid, 'cat': 'numeric', 'group': 'Backloggd/PANAX Tailwind (32)', 'name': f'{idx}. {name}',
        'tw': True, 'raw_html': html
    })

# ---------------------------------------------------------------------------
# Write CSS file
# ---------------------------------------------------------------------------
with open(OUT_CSS, 'w', encoding='utf-8') as f:
    f.write('\n'.join(css_parts))

# ---------------------------------------------------------------------------
# Extract Qwen1 and Qwen2 raw JS VARIANTS blocks directly for faithful rendering
# ---------------------------------------------------------------------------
def extract_qwen_variants_js(raw, marker='const VARIANTS=['):
    i = raw.find(marker)
    # match matching ];
    j = raw.find('];', i)
    # find closing of VARIANTS carefully by bracket depth
    k = raw.find('[', i)
    depth = 0
    for pos in range(k, len(raw)):
        c = raw[pos]
        if c == '[': depth += 1
        elif c == ']':
            depth -= 1
            if depth == 0:
                return raw[k:pos+1]
    raise RuntimeError('Could not find closing bracket for VARIANTS')

q1_variants_js = extract_qwen_variants_js(q1_raw)
q2_variants_js = extract_qwen_variants_js(q2_raw)
# Read metadata arrays to emit clean JS catalog
q1_meta = [
    ('qwen-pulse', 'Pulse (полная шкала)'),
    ('qwen-prism', 'Prism (3D стекло)'),
    ('qwen-pass', 'Game Pass (билет)'),
    ('qwen-paper', 'Paper (журнал)'),
    ('qwen-arcade', 'Arcade (CRT)'),
    ('qwen-keyart', 'Key Art (постер)'),
    ('qwen-inline', 'Inline (строка)'),
    ('qwen-holo', 'Holo Rare (карта)'),
    ('qwen-brutal', 'Brutal (брутализм)'),
    ('qwen-terminal', 'Terminal (HUD)'),
]
q2_meta = [
    ('qwen2-neon-hud', 'Neon HUD (терминал)'),
    ('qwen2-aurora-glass', 'Aurora Glass (3D стекло)'),
    ('qwen2-editorial', 'Editorial (журнал)'),
    ('qwen2-cartridge', 'Cartridge (картридж)'),
    ('qwen2-whisper', 'Whisper (минимал)'),
    ('qwen2-arcade-crt', 'Arcade CRT (аркада)'),
    ('qwen2-key-art', 'Key Art (постер)'),
    ('qwen2-slash', 'Slash (диагональ)'),
    ('qwen2-inline', 'Inline (в тексте)'),
    ('qwen2-telemetry', 'Telemetry (спарклайн)'),
    ('qwen2-holo-rare', 'Holo Rare (голо-карта)'),
    ('qwen2-loud', 'Loud (крупная форма)'),
]

all_meta = []
for v in variants:
    all_meta.append({'id': v['id'], 'cat': v['cat'], 'group': v['group'], 'name': v['name']})
for vid, name in q1_meta:
    all_meta.append({'id': vid, 'cat': 'panax', 'group': 'Qwen · PANAX (10)', 'name': name})
for vid, name in q2_meta:
    all_meta.append({'id': vid, 'cat': 'numeric', 'group': 'Qwen · Numeric (12)', 'name': name})

# Map template dictionary id -> { extra_cls, tw, raw_html }
tpl_map = {
    v['id']: {
        'tw': v['tw'],
        'extra': v.get('extra_cls', ''),
        'html': re.sub(r'\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+)', '', v['raw_html']),
    }
    for v in variants
}

js_out = f'''// AUTO-GENERATED by scripts/generate_cards.py — DO NOT HAND-EDIT
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({{ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }}[c]));
const safeUrl = (u) => {{
  const s = String(u || "").trim();
  if (!s) return "#";
  if (s === "#" || s.startsWith("/")) return s;
  return /^https?:\\/\\//i.test(s) ? s : "#";
}};

export const EXTRA_VARIANTS = {json.dumps(all_meta, ensure_ascii=False, indent=2)};
export const EXTRA_VARIANT_IDS = EXTRA_VARIANTS.map((v) => v.id);

function asciiBar(pct, len = 10) {{
  const n = Math.max(0, Math.min(len, Math.round((pct / 100) * len)));
  return "█".repeat(n) + "░".repeat(len - n);
}}

export function extractCardMetrics(d, rxList) {{
  const r = d.ratings || {{}};
  const links = d.links || {{}};
  const rx = rxList || [];
  const rxTotal = rx.reduce((s, x) => s + x.val, 0);
  const sorted = [...rx].sort((a, b) => b.val - a.val);
  const top1 = sorted[0] || {{ k: "legendary", name: "Легенда", color: "#f3cb16", icon: "🏆", badge: "", val: 0 }};
  const top2 = sorted[1] || {{ k: "awesome", name: "Круто", color: "#f2a000", icon: "🤘", badge: "", val: 0 }};
  const top3 = sorted[2] || {{ k: "good", name: "Хорошо", color: "#bd55e9", icon: "😄", badge: "", val: 0 }};
  const posPct = rx.slice(0, 3).reduce((s, x) => s + x.val, 0);
  const maxRx = Math.max(1, ...rx.map((x) => x.val));

  // Derive normalized 0..10 numeric score
  const parseNum = (v) => {{
    if (v == null) return null;
    const m = String(v).match(/(\\d+(?:[.,]\\d+)?)/);
    return m ? parseFloat(m[1].replace(",", ".")) : null;
  }};
  let score10Num = null;
  let scoreSource = "PANAX";
  const blNum = parseNum(r.backloggd);
  const pxNum = parseNum(r.panax);
  const igNum = parseNum(r.igdb);
  const stNum = parseNum(r.steam);
  if (blNum != null) {{ score10Num = blNum <= 5 ? blNum * 2 : blNum; scoreSource = "Backloggd"; }}
  else if (pxNum != null) {{ score10Num = pxNum <= 5 ? pxNum * 2 : pxNum; scoreSource = "PANAX"; }}
  else if (rxTotal > 0) {{
    const w = (rx[0].val * 10 + rx[1].val * 8.8 + rx[2].val * 7.4 + rx[3].val * 5.8 + rx[4].val * 3.5 + rx[5].val * 1.5) / rxTotal;
    score10Num = w;
    scoreSource = "PANAX";
  }} else if (igNum != null) {{ score10Num = igNum > 10 ? igNum / 10 : igNum; scoreSource = "IGDB"; }}
  else if (stNum != null) {{ score10Num = stNum / 10; scoreSource = "Steam"; }}
  else {{ score10Num = 8.4; scoreSource = "PANAX"; }}

  score10Num = Math.max(0, Math.min(10, score10Num));
  const score10 = score10Num.toFixed(1);
  const score5 = (score10Num / 2).toFixed(1);
  const scorePctNum = Math.round(score10Num * 10);
  const igdbScore = Math.round(igNum != null ? (igNum <= 10 ? igNum * 10 : igNum) : scorePctNum);
  const steamPct = Math.round(stNum != null ? stNum : Math.min(99, Math.max(10, scorePctNum)));

  const year = String(d.year || "2025");
  const dev = String(d.dev || "");
  const pub = String(d.pub || "");
  const meta = [year, [dev, pub].filter(Boolean).join(" · ")].filter(Boolean).join(" · ") || "PANAX";
  const genres = Array.isArray(d.genres) && d.genres.length ? d.genres.slice(0, 4) : ["Игра"];
  const plat = Array.isArray(d.plat) && d.plat.length ? d.plat.slice(0, 3) : ["PC"];
  const panaxUrl = safeUrl(links.panax || links.backloggd || links.igdb || "#");

  return {{
    title: String(d.title || "Игра"),
    year,
    dev: dev || pub || "Studio",
    pub: pub || dev || "Publisher",
    devPub: [dev, pub].filter(Boolean).join(" · ") || "Studio",
    meta,
    genres,
    plat,
    cover: safeUrl(d.cover) !== "#" ? d.cover : (d.cover || ""),
    panaxUrl,
    steamUrl: safeUrl(links.steam || panaxUrl),
    igdbUrl: safeUrl(links.igdb || panaxUrl),
    backloggdUrl: safeUrl(links.backloggd || panaxUrl),
    score10Num,
    score10,
    score5,
    scorePctNum,
    scorePct: scorePctNum + "%",
    scoreSource,
    igdbScore,
    steamPct,
    rx,
    rxTotal,
    maxRx,
    top1,
    top2,
    top3,
    posPct: posPct.toFixed(1),
    posInt: Math.round(posPct)
  }};
}}

const TEMPLATES = {json.dumps(tpl_map, ensure_ascii=False)};

function buildConic(rx, total) {{
  if (!total) return "conic-gradient(#3f3f46 0% 100%)";
  let acc = 0;
  const stops = [];
  for (const x of rx) {{
    const pct = (x.val / total) * 100;
    if (pct <= 0) continue;
    stops.push(`${{x.color}} ${{acc.toFixed(1)}}% ${{(acc + pct).toFixed(1)}}%`);
    acc += pct;
  }}
  return stops.length ? `conic-gradient(${{stops.join(", ")}})` : "conic-gradient(#3f3f46 0% 100%)";
}}

function fillTemplate(raw, M) {{
  const {{ rx, rxTotal, maxRx, top1, top2, top3 }} = M;
  const genreSpans = M.genres.map((g) => `<span>${{esc(g)}}</span>`).join("");
  const norm = rx.map((x) => (rxTotal > 0 ? (x.val / rxTotal) * 100 : 0));

  let s = raw
    .replaceAll("__COVER_URL__", esc(M.cover))
    .replaceAll("__COVER__", esc(M.cover))
    .replaceAll("__TITLE_UPPER__", esc(M.title.toUpperCase()))
    .replaceAll("__TITLE__", esc(M.title))
    .replaceAll("__META_ITALIC__", esc(M.meta).replace(/ · /g, " <i>·</i> "))
    .replaceAll("__META__", esc(M.meta))
    .replaceAll("__DEV_PUB__", esc(M.devPub))
    .replaceAll("__DEV__", esc(M.dev))
    .replaceAll("__YEAR__", esc(M.year))
    .replaceAll("__GENRE_SPANS__", genreSpans)
    .replaceAll("__GENRES_DOT__", esc(M.genres.join(" · ")))
    .replaceAll("__GENRES_SLASH__", esc(M.genres.join(" / ")))
    .replaceAll("__GENRE_0__", esc(M.genres[0] || ""))
    .replaceAll("__GENRE_1__", esc(M.genres[1] || ""))
    .replaceAll("__GENRE_2__", esc(M.genres[2] || ""))
    .replaceAll("__SCORE_SRC__", esc(M.scoreSource))
    .replaceAll("__SCORE10__", esc(M.score10))
    .replaceAll("__SCORE5__", esc(M.score5))
    .replaceAll("__SCORE_PCT_NUM__", String(M.scorePctNum))
    .replaceAll("__SCORE_PCT__", esc(M.scorePct))
    .replaceAll("__IGDB__", String(M.igdbScore))
    .replaceAll("__STEAM_NUM__", String(M.steamPct))
    .replaceAll("__STEAM_PCT__", M.steamPct + "%")
    .replaceAll("__ASCII_BAR__", asciiBar(M.scorePctNum))
    .replaceAll("__ASCII_IGDB__", asciiBar(M.igdbScore))
    .replaceAll("__ASCII_STEAM__", asciiBar(M.steamPct))
    .replaceAll("__DOCK_DASH__", `${{(M.scorePctNum * 2.136).toFixed(1)}} 213.6`)
    .replaceAll("__PANAX_URL__", esc(M.panaxUrl))
    .replaceAll("__BL_URL__", esc(M.backloggdUrl))
    .replaceAll("__STEAM_URL__", esc(M.steamUrl))
    .replaceAll("__IGDB_URL__", esc(M.igdbUrl))
    .replaceAll("__CONIC_GRAD__", buildConic(rx, rxTotal))
    .replaceAll("__TOP1_NAME__", esc(top1.name))
    .replaceAll("__TOP1_LABEL__", esc(top1.name.toUpperCase()))
    .replaceAll("__TOP1_COLOR__", esc(top1.color))
    .replaceAll("__TOP1_ICON__", esc(top1.icon))
    .replaceAll("__TOP1_PCT__", top1.val.toFixed(1))
    .replaceAll("__TOP1_INT__", String(Math.round(top1.val)))
    .replaceAll("__TOP2_NAME__", esc(top2.name))
    .replaceAll("__TOP2_INT__", String(Math.round(top2.val)))
    .replaceAll("__POS_PCT__", M.posPct)
    .replaceAll("__POS_INT__", String(M.posInt))
    .replaceAll("__RX_BADGE_TOP1__", esc(top1.badge || ""));

  for (let i = 0; i < 6; i++) {{
    const x = rx[i] || {{ val: 0, icon: "", badge: "", color: "#888", name: "" }};
    const rel = rxTotal > 0 ? Math.max(4, Math.round((x.val / maxRx) * 100)) : 4;
    s = s
      .replaceAll(`__RX_PCT_${{i}}__`, x.val.toFixed(1) + "%")
      .replaceAll(`__RX_PCT_RAW_${{i}}__`, x.val.toFixed(1))
      .replaceAll(`__RX_VAL_${{i}}__`, x.val.toFixed(1))
      .replaceAll(`__RX_REL_${{i}}__`, String(rel))
      .replaceAll(`__RX_ICON_${{i}}__`, esc(x.icon))
      .replaceAll(`__RX_BADGE_${{i}}__`, esc(x.badge || ""));
  }}

  if (s.includes("__TOP1_BADGE_IMG_36__")) {{
    s = s.replaceAll("__TOP1_BADGE_IMG_36__", top1.badge ? `<img src="${{esc(top1.badge)}}" alt="" style="width:36px;height:36px;object-fit:contain">` : `<span>${{esc(top1.icon)}}</span>`);
  }}
  if (s.includes("__TW32_LINKS__")) {{
    s = s.replaceAll("__TW32_LINKS__", `<a href="${{esc(M.panaxUrl)}}" target="_blank" rel="noopener" class="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-bold">PANAX ↗</a><a href="${{esc(M.igdbUrl)}}" target="_blank" rel="noopener" class="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px]">IGDB</a><a href="${{esc(M.steamUrl)}}" target="_blank" rel="noopener" class="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px]">Steam</a>`);
  }}
  // Panax 4 variants partials
  if (s.includes("__PANAX4_MINI_BARS__")) {{
    s = s.replaceAll("__PANAX4_MINI_BARS__", `<div class="mini">${{rx.map((x) => `<i class="${{x.val<=0?'z':''}}" style="--h:${{rxTotal?Math.round((x.val/maxRx)*100):0}}%;--c:${{x.color}}"></i>`).join("")}}</div>`);
  }}
  if (s.includes("__PANAX4_MEDAL_ROW__")) {{
    s = s.replaceAll("__PANAX4_MEDAL_ROW__", `<div class="medal" style="--c:${{top1.color}}"><div><b>${{Math.round(top1.val)}}</b><small>${{esc(top1.name)}}</small></div></div><div class="top3"><b>${{top1.val.toFixed(1)}}%</b> ${{esc(top1.name.toLowerCase())}} · <b>${{top2.val.toFixed(1)}}%</b> ${{esc(top2.name.toLowerCase())}}<br>${{top3.val.toFixed(1)}}% ${{esc(top3.name.toLowerCase())}}</div>`);
  }}
  if (s.includes("__PANAX4_STRIP__")) {{
    s = s.replaceAll("__PANAX4_STRIP__", `<div class="strip"><div class="track" style="background:linear-gradient(90deg,${{rx.filter(x=>x.val>0).map(x=>x.color).join(",")||top1.color}})"></div><div class="keys">${{rx.filter(x=>x.val>0).slice(0,4).map(x=>`<span><i style="background:${{x.color}}"></i>${{esc(x.name)}} ${{Math.round(x.val)}}%</span>`).join("")}}</div></div>`);
  }}
  if (s.includes("__PANAX4_SCALE__")) {{
    const pos = Math.min(96, Math.max(4, M.scorePctNum));
    s = s.replaceAll("__PANAX4_SCALE__", `<div class="scale"><div class="mark" style="left:${{pos}}%"></div><div class="cap">${{esc(top1.name)}} · ${{Math.round(top1.val)}}% · положительных ${{M.posPct}}%</div></div>`);
  }}
  // Sonnet PANAX (10) partials
  if (s.includes("__SON_H1_BODY__")) {{
    s = s.replaceAll("__SON_H1_BODY__", `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:8px"><span class="lvl" style="color:${{top1.color}}">${{esc(top1.name)}}</span><span class="mt">${{top1.val.toFixed(1)}}% игроков</span></div><div class="sp">${{rx.filter(x=>x.val>0).map((x,i)=>`<i style="--w:${{norm[rx.indexOf(x)].toFixed(1)}}%;--c:${{x.color}}"></i>`).join("")}}</div><div class="lg">${{rx.filter(x=>x.val>0).map(x=>`<span>${{esc(x.name)}} ${{x.val.toFixed(1)}}</span>`).join("")}}</div>`);
  }}
  if (s.includes("__SON_WAFFLE__")) {{
    const cells = [];
    rx.forEach((x) => {{ for (let i = 0; i < Math.round(x.val); i++) cells.push(`<i style="background:${{x.color}}"></i>`); }});
    while (cells.length < 100) cells.push(`<i style="background:rgba(255,255,255,.08)"></i>`);
    s = s.replaceAll("__SON_WAFFLE__", cells.slice(0, 100).join(""));
  }}
  if (s.includes("__SON_H3_SVG__")) {{
    const pts = rx.map((x, i) => `${{i * 80}},${{Math.round(112 - (x.val / maxRx) * 90)}}`);
    s = s.replaceAll("__SON_H3_SVG__", `<svg viewBox="0 0 400 120" preserveAspectRatio="none"><polygon points="${{pts.join(" ")}} 400,120 0,120" fill="${{top1.color}}" fill-opacity=".22"/><polyline points="${{pts.join(" ")}}" fill="none" stroke="${{top1.color}}" stroke-width="3"/></svg>`);
  }}
  if (s.includes("__SON_TOP_SUMMARY__")) {{
    s = s.replaceAll("__SON_TOP_SUMMARY__", `${{esc(top2.name)}} ${{Math.round(top2.val)}} · ${{esc(top3.name)}} ${{Math.round(top3.val)}}`);
  }}
  if (s.includes("__SON_ORBIT_SVG__")) {{
    s = s.replaceAll("__SON_ORBIT_SVG__", `<svg viewBox="0 0 120 120" style="width:120px;height:120px"><circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="12"/><circle cx="60" cy="60" r="46" fill="none" stroke="${{top1.color}}" stroke-width="12" stroke-dasharray="${{(top1.val * 2.89).toFixed(1)}} 289" transform="rotate(-90 60 60)"/></svg>`);
  }}
  if (s.includes("__SON_SEGMENTS__")) {{
    s = s.replaceAll("__SON_SEGMENTS__", rx.map((x) => `<div class="sg-r"><span>${{esc(x.name)}}</span><div class="sg-t"><i style="width:${{Math.round((x.val/maxRx)*100)}}%;background:${{x.color}}"></i></div><b>${{x.val.toFixed(1)}}%</b></div>`).join(""));
  }}
  if (s.includes("__SON_PODIUM__")) {{
    s = s.replaceAll("__SON_PODIUM__", `<div class="pd">${{[top2, top1, top3].map((x, idx) => `<div class="p-${{idx===1?'1':idx===0?'2':'3'}}" style="border-top:3px solid ${{x.color}}"><b>${{Math.round(x.val)}}%</b><span>${{esc(x.name)}}</span></div>`).join("")}}</div>`);
  }}
  if (s.includes("__SON_TILES__")) {{
    s = s.replaceAll("__SON_TILES__", `<div class="tl">${{rx.map((x) => `<div style="border-left:3px solid ${{x.color}}"><b>${{x.val.toFixed(1)}}%</b><span>${{esc(x.name)}}</span></div>`).join("")}}</div>`);
  }}
  // tw10 reaction partials
  if (s.includes("__TWP_W1_BAR__")) {{
    s = s.replaceAll("__TWP_W1_BAR__", rx.map((x, i) => norm[i] > 0.1 ? `<div class="h-full bar-anim first:rounded-l-full last:rounded-r-full" style="width:${{norm[i].toFixed(2)}}%;background:${{x.color}}"></div>` : "").join(""));
  }}
  if (s.includes("__TWP_W1_LEGEND__")) {{
    s = s.replaceAll("__TWP_W1_LEGEND__", rx.map((x) => `<div class="flex items-center justify-between text-xs"><span class="flex items-center gap-1.5 font-semibold" style="color:${{x.color}}"><i class="w-2 h-2 rounded-full inline-block" style="background:${{x.color}}"></i>${{esc(x.name)}}</span><span class="font-mono-tech text-zinc-300">${{x.val.toFixed(1)}}%</span></div>`).join(""));
  }}
  if (s.includes("__TWP_W2_PILLARS__")) {{
    s = s.replaceAll("__TWP_W2_PILLARS__", rx.map((x) => `<div class="flex flex-col items-center gap-1.5 flex-1"><span class="font-mono-tech text-[11px] font-bold" style="color:${{x.color}}">${{x.val.toFixed(1)}}%</span><div class="w-full h-24 rounded-md bg-white/5 flex items-end overflow-hidden p-0.5"><div class="w-full rounded-sm bar-anim" style="height:${{rxTotal?Math.max(4,Math.round((x.val/maxRx)*100)):4}}%;background:${{x.color}}"></div></div><span class="text-[10px] text-zinc-400 font-semibold">${{esc(x.name)}}</span></div>`).join(""));
  }}
  if (s.includes("__TWP_W3_LIST__")) {{
    s = s.replaceAll("__TWP_W3_LIST__", rx.map((x) => `<div class="flex items-center justify-between text-xs"><span class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full" style="background:${{x.color}}"></span>${{esc(x.name)}}</span><b class="font-mono-tech">${{x.val.toFixed(1)}}%</b></div>`).join(""));
  }}
  if (s.includes("__TWP_W4_LEADER__")) {{
    s = s.replaceAll("__TWP_W4_LEADER__", `<span class="text-xs font-mono-tech uppercase text-stone-500">ЛИДЕР:</span> <b style="color:${{top1.color}}">${{esc(top1.name)}} · ${{top1.val.toFixed(1)}}%</b>`);
  }}
  if (s.includes("__TWP_W4_KEYS__")) {{
    s = s.replaceAll("__TWP_W4_KEYS__", rx.map((x) => `<div class="te-keycap bg-white border border-stone-300 rounded-lg p-2 text-center"><div class="text-[10px] font-bold" style="color:${{x.color}}">${{esc(x.name)}}</div><div class="font-mono-tech text-sm font-extrabold text-stone-900">${{x.val.toFixed(1)}}%</div></div>`).join(""));
  }}
  if (s.includes("__TWP_W5_PODIUM__")) {{
    s = s.replaceAll("__TWP_W5_PODIUM__", [top2, top1, top3].map((x, idx) => `<div class="flex-1 rounded-xl p-3 bg-white/5 border border-white/10 text-center" style="border-top:3px solid ${{x.color}}"><div class="text-xs text-zinc-400">#${{idx===1?1:idx===0?2:3}}</div><div class="text-lg font-extrabold font-mono-tech" style="color:${{x.color}}">${{x.val.toFixed(1)}}%</div><div class="text-xs font-bold">${{esc(x.name)}}</div></div>`).join(""));
  }}
  if (s.includes("__TWP_W5_REST__")) {{
    s = s.replaceAll("__TWP_W5_REST__", rx.slice(3).map((x) => `<span class="text-[11px] text-zinc-400">${{esc(x.name)}}: <b>${{x.val.toFixed(1)}}%</b></span>`).join(" · "));
  }}
  if (s.includes("__TWP_W6_CELLS__")) {{
    s = s.replaceAll("__TWP_W6_CELLS__", rx.map((x) => `<div class="flex-1 px-2 py-2 bg-black/50 backdrop-blur rounded-lg border border-white/10 text-center"><div class="text-[10px]" style="color:${{x.color}}">${{esc(x.name)}}</div><div class="font-mono-tech text-xs font-bold text-white">${{x.val.toFixed(1)}}%</div></div>`).join(""));
  }}
  if (s.includes("__TWP_W7_ROWS__")) {{
    s = s.replaceAll("__TWP_W7_ROWS__", rx.map((x) => `<div class="flex items-center gap-2 font-mono-tech text-xs"><span class="w-16" style="color:${{x.color}}">${{esc(x.name)}}</span><span class="text-emerald-400">${{asciiBar(rxTotal?(x.val/maxRx)*100:0, 14)}}</span><span class="ml-auto">${{x.val.toFixed(1)}}%</span></div>`).join(""));
  }}
  if (s.includes("__TWP_W8_TABLE__")) {{
    s = s.replaceAll("__TWP_W8_TABLE__", rx.map((x) => `<div class="flex items-center justify-between py-1.5 border-b border-black/15 text-xs"><b>${{esc(x.name)}}</b><span class="font-mono-tech font-bold">${{x.val.toFixed(1)}}%</span></div>`).join(""));
  }}
  if (s.includes("__TWP_W9_LABELS__")) {{
    s = s.replaceAll("__TWP_W9_LABELS__", rx.map((x) => `<div class="text-center"><div class="text-[10px] font-bold" style="color:${{x.color}}">${{esc(x.name)}}</div><div class="font-mono-tech text-[11px] text-zinc-300">${{x.val.toFixed(1)}}%</div></div>`).join(""));
  }}
  if (s.includes("__TWP_W10_BAR__")) {{
    s = s.replaceAll("__TWP_W10_BAR__", rx.map((x, i) => norm[i] > 0.5 ? `<div style="width:${{norm[i].toFixed(1)}}%;background:${{x.color}}" class="h-full"></div>` : "").join(""));
  }}
  return s;
}}

// Qwen 1 (PANAX) runtime
const Q1_TIERS = [
  {{ name: "ЛЕГЕНДА", color: "#ffd60a", ribbon: "#b8860b", icon: '<path d="M4 9.2 7.6 11.7 12 5.2l4.4 6.5L20 9.2l-1.5 8.6H5.5Z" fill="currentColor"/><rect x="5" y="18.6" width="14" height="2.6" rx="1.3" fill="currentColor" opacity=".8"/><circle cx="4" cy="8.6" r="1.5" fill="currentColor"/><circle cx="12" cy="4.6" r="1.5" fill="currentColor"/><circle cx="20" cy="8.6" r="1.5" fill="currentColor"/>' }},
  {{ name: "КРУТО", color: "#ff9500", ribbon: "#1fb6d4", icon: '<circle cx="12" cy="12" r="9.6" fill="currentColor"/><path d="M7.3 6.6l.85 1.75 1.75.85-1.75.85-.85 1.75-.85-1.75-1.75-.85 1.75-.85Z" fill="#fff"/><path d="M16.7 6.6l.85 1.75 1.75.85-1.75.85-.85 1.75-.85-1.75-1.75-.85 1.75-.85Z" fill="#fff"/>' }},
  {{ name: "ХОРОШО", color: "#c05cff", ribbon: "#43b649", icon: '<path d="M6.8 10.2v10.6H4.2a1.6 1.6 0 0 1-1.6-1.6v-7.4a1.6 1.6 0 0 1 1.6-1.6Z" fill="currentColor" opacity=".75"/><path d="M6.8 10.2 11 3.1c.6-1.1 2.4-.7 2.4.6v4.9h5.5a2 2 0 0 1 2 2.3l-1.1 6.9a2 2 0 0 1-2 1.7H6.8Z" fill="currentColor"/>' }},
  {{ name: "НОРМ", color: "#3d9bff", ribbon: "#ff9800", icon: '<circle cx="12" cy="12" r="8" fill="currentColor"/>' }},
  {{ name: "ПЛОХО", color: "#9aa5b1", ribbon: "#cf9b4e", icon: '<circle cx="12" cy="12" r="8" fill="currentColor"/>' }},
  {{ name: "УЖАС", color: "#ff3b5c", ribbon: "#d32f2f", icon: '<circle cx="12" cy="12" r="9.6" fill="#8bc34a"/>' }}
];

function buildQwen1Vars() {{
  const I = {{
    pad: '<svg class="i" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="4"/></svg>',
    chart: '<svg class="i" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>',
    flame: '<svg class="i" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/></svg>',
    globe: '<svg class="i" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/></svg>',
    ext: "↗", code: "<>", star: "★"
  }};
  const pxLogo = () => `<span class="pxlogo"><svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M6 18V6h7a4 4 0 0 1 0 8H9" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><b>PANAX</b></span>`;
  const posPct = (g) => g.votes.slice(0, 3).reduce((a, b) => a + b, 0).toFixed(1);
  const tagSpans = (g) => g.tags.map((t) => `<span>${{esc(t)}}</span>`).join("");
  const go = (g, cls, ic = "→") => `<a class="${{cls}}" href="${{esc(g.url)}}" target="_blank" rel="noopener">Открыть на PANAX ${{ic}}</a>`;
  const Araw = (g) => `<a class="w10-link" href="${{esc(g.url)}}" target="_blank" rel="noopener">PANAX</a>`;
  const rating = (g, size = "", light = false) => {{
    const maxV = Math.max(1, ...g.votes);
    const items = Q1_TIERS.map((t, i) => {{
      const v = g.votes[i] || 0;
      const pctH = Math.round((v / maxV) * 100);
      return `<div class="pxr-col" style="--c:${{t.color}};--rib:${{t.ribbon}}">
        <div class="pxr-bar"><i style="height:${{pctH}}%"></i></div>
        <div class="pxr-ico"><svg viewBox="0 0 24 24">${{t.icon}}</svg></div>
        <span class="pxr-lbl">${{t.name}}</span>
        <b class="pxr-pct">${{v.toFixed(1)}}%</b>
      </div>`;
    }}).join("");
    return `<div class="pxr ${{size}} ${{light ? "pxr-light" : ""}}">${{items}}</div>`;
  }};
  const ratingInline = (g) => `<div class="pxi">${{Q1_TIERS.map((t, i) => `<span style="--c:${{t.color}}"><i></i>${{t.name}} ${{(g.votes[i]||0).toFixed(0)}}%</span>`).join("")}}</div>`;
  const VARIANTS = {q1_variants_js};
  return VARIANTS;
}}

let _q1Cache = null;
function renderQwen1(slug, M, tools) {{
  if (!_q1Cache) _q1Cache = buildQwen1Vars();
  const v = _q1Cache.find((x) => "qwen-" + x.slug === slug);
  if (!v) return null;
  const g = {{
    id: M.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "game",
    title: esc(M.title),
    year: esc(M.year),
    dev: esc(M.dev),
    pub: esc(M.pub),
    tags: M.genres.map(esc),
    platforms: M.plat.map(esc),
    desc: esc(M.genres.join(" · ") + " · " + M.year),
    total: M.rxTotal > 0 ? Math.round(M.rxTotal * 10) : 100,
    hltb: "—",
    url: M.panaxUrl,
    votes: M.rx.map((x) => x.val),
    a: "#7c5cff",
    b: "#22d3ee"
  }};
  return `<div class="w w-game v-${{esc(slug)}} qwen1-scope">${{tools}}${{v.r(g, esc(M.cover), "01")}}</div>`;
}}

function buildQwen2Vars() {{
  const I = {{
    pad: '<svg class="i" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="4"/></svg>',
    chart: '<svg class="i" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg>',
    flame: '<svg class="i" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/></svg>',
    globe: '<svg class="i" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/></svg>',
    ext: "↗",
    code: "<>",
    star: "★"
  }};
  const fmt1 = (n) => Number(n || 0).toFixed(1);
  const sc = (g) => g.score10;
  const igdbU = (g) => g.igdbUrl;
  const steamU = (g) => g.steamUrl;
  const rawgU = (g) => g.panaxUrl;
  const blU = (g) => g.backloggdUrl;
  const linkSet = (g, s) => [
    {{ n: s.name, u: s.url(g), i: I.pad }},
    {{ n: "IGDB", u: g.igdbUrl, i: I.chart }},
    {{ n: "Steam", u: g.steamUrl, i: I.flame }}
  ];
  const A = (u, cls, inner, title) => `<a class="${{cls}}" href="${{esc(safeUrl(u))}}" target="_blank" rel="noopener"${{title ? ` title="${{esc(title)}}"` : ""}}>${{inner}}</a>`;
  const tagChips = (g) => g.tags.map((t) => `<span>${{esc(t)}}</span>`).join("");
  const stars = (n) => "★".repeat(Math.max(1, Math.min(5, Math.round(n / 2))));
  const VARIANTS = {q2_variants_js};
  return VARIANTS;
}}

let _q2Cache = null;
function renderQwen2(slug, M, tools) {{
  if (!_q2Cache) _q2Cache = buildQwen2Vars();
  const v = _q2Cache.find((x) => "qwen2-" + x.slug === slug);
  if (!v) return null;
  const g = {{
    id: M.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "game",
    title: esc(M.title),
    year: esc(M.year),
    dev: esc(M.dev),
    pub: esc(M.pub),
    tags: M.genres.map(esc),
    platforms: M.plat.map(esc),
    desc: esc(M.genres.join(" · ")),
    igdb: M.igdbScore,
    steam: M.steamPct,
    back: M.score10Num,
    panaax: M.score10Num,
    score10: M.score10Num,
    igdbUrl: M.igdbUrl,
    steamUrl: M.steamUrl,
    backloggdUrl: M.backloggdUrl,
    panaxUrl: M.panaxUrl,
    a: "#5b8cff",
    b: "#8f6bff",
    spark: [62, 68, 74, 71, 80, 84, M.scorePctNum],
    dist: M.rxTotal > 0 ? M.rx.slice(0, 5).map((x) => Math.round(x.val)) : [42, 32, 16, 6, 4],
    reviews: M.rxTotal > 0 ? Math.round(M.rxTotal * 12) : 640,
    hltb: "30 ч",
    players: "Single"
  }};
  const s = {{
    id: "panax",
    name: M.scoreSource,
    mono: M.scoreSource === "Backloggd" ? "BL" : "PX",
    color: "#8f6bff",
    url: (x) => x.panaxUrl
  }};
  return `<div class="w w-game v-${{esc(slug)}} qwen2-scope">${{tools}}${{v.r(g, s, esc(M.cover), "01")}}</div>`;
}}

export function renderExtraGameCard(variantId, d, tools, rxList) {{
  const M = extractCardMetrics(d, rxList);
  if (variantId.startsWith("qwen-")) return renderQwen1(variantId, M, tools || "");
  if (variantId.startsWith("qwen2-")) return renderQwen2(variantId, M, tools || "");
  const tpl = TEMPLATES[variantId];
  if (!tpl) return null;
  const cls = ["w", "w-game", "v-" + variantId];
  if (tpl.tw) cls.push("tw-card");
  if (tpl.extra) cls.push(tpl.extra);
  return `<div class="${{cls.join(" ")}}">${{tools || ""}}${{fillTemplate(tpl.html, M)}}</div>`;
}}
'''

with open(OUT_JS, 'w', encoding='utf-8') as f:
    f.write(js_out)

print(f'Generated {len(all_meta)} extra variants -> {OUT_JS} ({len(js_out)} bytes), {OUT_CSS} ({os.path.getsize(OUT_CSS)} bytes)')
print('Breakdown:', 'numeric =', sum(1 for x in all_meta if x["cat"] == "numeric"), ', panax =', sum(1 for x in all_meta if x["cat"] == "panax"))
