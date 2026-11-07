"""Retira do mapa os GBMs que ainda não existem (lista em FORA).
Uso: python tools/remove_gbms.py mapa_simples.json mapa.json
Atua em quartéis, áreas de atuação, Voronoi e isócronas (isócrona = a do quartel mais próximo do centro)."""
import json, re, math, sys
src, dst = sys.argv[1], sys.argv[2]
FORA = {'4', '40', '42', '43'}
d = json.load(open(src, encoding='utf-8'))
C = {c['id']: c for c in d['camadas']}
num = lambda t: (re.search(r'(\d+)', t or '') or [None, None])[1]
sig = lambda f: (f['properties'].get('attrs') or {}).get('seg_sigla') or f['properties'].get('nome') or ''
q = C['grupamentos_cbmdf']['features']
pts = [(num(sig(f)), *f['geometry']['coordinates'][:2]) for f in q]
def iso_gbm(f):
    a = f['properties']['attrs']; lon, lat = float(a['CENTER_LON']), float(a['CENTER_LAT'])
    return min(pts, key=lambda p: math.hypot((lon - p[1]) * math.cos(math.radians(lat)), lat - p[2]))[0]
regra = {
    'grupamentos_cbmdf': lambda f: num(sig(f)),
    'previa_atuacao_dos_gbms_2025_gbms_area_atuaoshp': lambda f: num(f['properties'].get('nome')),
    'voronoi_polygons': lambda f: num(sig(f)),
    'isochrones_6_min_de_deslocamento': iso_gbm,
}
for cid, fn in regra.items():
    antes = len(C[cid]['features'])
    C[cid]['features'] = [f for f in C[cid]['features'] if fn(f) not in FORA]
    print(cid, antes, '->', len(C[cid]['features']))
json.dump(d, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
