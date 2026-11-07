"""Converte o doc.kml (extraído do KMZ) em mapa.json para a aba Visão espacial.
Uso: python tools/kml2json.py doc.kml mapa_bruto.json [casas_decimais=5]
Guarda nome, estilo (cor do KML aabbggrr -> #rrggbb) e atributos de cada item, por camada (pasta do KML)."""
import sys, json, math, re
import xml.etree.ElementTree as ET
ns = {'k': 'http://www.opengis.net/kml/2.2'}
src, out = sys.argv[1], sys.argv[2]
PREC = int(sys.argv[3]) if len(sys.argv) > 3 else 5
r = ET.parse(src).getroot(); doc = r.find('k:Document', ns)

def kcolor(c):
    c = (c or 'ff000000').strip()
    a, b, g, rr = c[0:2], c[2:4], c[4:6], c[6:8]
    return '#' + rr + g + b, round(int(a, 16) / 255, 3)

styles = {}
for s in doc.findall('k:Style', ns):
    d = {}
    ls = s.find('k:LineStyle', ns); ps = s.find('k:PolyStyle', ns)
    if ls is not None:
        d['color'], d['opacity'] = kcolor(ls.findtext('k:color', namespaces=ns)); d['weight'] = float(ls.findtext('k:width', namespaces=ns) or 1)
    if ps is not None:
        d['fillColor'], d['fillOpacity'] = kcolor(ps.findtext('k:color', namespaces=ns))
        if (ps.findtext('k:fill', namespaces=ns) or '1') == '0': d['fillOpacity'] = 0
    styles['#' + s.get('id')] = d
for sm in doc.findall('k:StyleMap', ns):
    for pr in sm.findall('k:Pair', ns):
        if pr.findtext('k:key', namespaces=ns) == 'normal':
            styles['#' + sm.get('id')] = styles.get(pr.findtext('k:styleUrl', namespaces=ns), {})

def coords(txt):
    pts = []
    for tok in (txt or '').split():
        p = tok.split(',')
        if len(p) >= 2:
            pts.append([round(float(p[0]), PREC), round(float(p[1]), PREC)])
    # drop consecutive duplicates
    outp = []
    for q in pts:
        if not outp or outp[-1] != q: outp.append(q)
    return outp

def geom(el):
    tag = el.tag.split('}')[1]
    if tag == 'Point':
        c = coords(el.findtext('k:coordinates', namespaces=ns)); return {'type': 'Point', 'coordinates': c[0]}
    if tag == 'LineString':
        return {'type': 'LineString', 'coordinates': coords(el.findtext('k:coordinates', namespaces=ns))}
    if tag == 'Polygon':
        rings = [coords(el.findtext('k:outerBoundaryIs/k:LinearRing/k:coordinates', namespaces=ns))]
        for ib in el.findall('k:innerBoundaryIs', ns):
            rings.append(coords(ib.findtext('k:LinearRing/k:coordinates', namespaces=ns)))
        return {'type': 'Polygon', 'coordinates': rings}
    if tag == 'MultiGeometry':
        gs = [geom(ch) for ch in el if ch.tag.split('}')[1] in ('Point', 'LineString', 'Polygon', 'MultiGeometry')]
        polys = [g['coordinates'] for g in gs if g['type'] == 'Polygon']
        if polys and len(polys) == len(gs): return {'type': 'MultiPolygon', 'coordinates': polys}
        return {'type': 'GeometryCollection', 'geometries': gs}
    return None

layers = []
for f in doc.findall('k:Folder', ns):
    feats = []
    for p in f.findall('k:Placemark', ns):
        g = None
        for ch in p:
            t = ch.tag.split('}')[1]
            if t in ('Point', 'LineString', 'Polygon', 'MultiGeometry'): g = geom(ch); break
        if g is None: continue
        attrs = {}
        ed = p.find('k:ExtendedData', ns)
        if ed is not None:
            for d in ed.findall('k:Data', ns):
                v = (d.findtext('k:value', namespaces=ns) or '').strip()
                if v: attrs[d.get('name')] = v
        feats.append({'type': 'Feature', 'geometry': g, 'properties': {'nome': (p.findtext('k:name', namespaces=ns) or '').strip(), 'estilo': styles.get(p.findtext('k:styleUrl', namespaces=ns), {}), 'attrs': attrs}})
    layers.append({'id': re.sub(r'[^a-z0-9]+', '_', (f.findtext('k:name', namespaces=ns) or '').lower()).strip('_'), 'nomeOriginal': f.findtext('k:name', namespaces=ns), 'features': feats})

data = {'documento': doc.findtext('k:name', namespaces=ns), 'descricao': (doc.findtext('k:description', namespaces=ns) or '').strip(), 'camadas': layers}
json.dump(data, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
for L in layers:
    n = sum(len(json.dumps(ft['geometry'])) for ft in L['features'])
    print(L['id'], len(L['features']), 'geom bytes', n)
