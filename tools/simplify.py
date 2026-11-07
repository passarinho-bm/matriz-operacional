"""Simplifica as linhas e polígonos do mapa (Ramer-Douglas-Peucker) para deixar o arquivo menor.
Uso: python tools/simplify.py mapa_bruto.json mapa_simples.json TOLERANCIA
TOLERANCIA em graus. Exemplo: 0.00003 (cerca de 3 m)."""
import sys, json
src, out, tol = sys.argv[1], sys.argv[2], float(sys.argv[3])
def rdp(pts, eps):
    if len(pts) < 5: return pts
    stack = [(0, len(pts) - 1)]; keep = [False] * len(pts); keep[0] = keep[-1] = True
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx - ax, by - ay; L = (dx * dx + dy * dy) or 1e-18
        best, bi = -1, None
        for i in range(a + 1, b):
            px, py = pts[i]
            t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
            qx, qy = ax + t * dx, ay + t * dy
            d = (px - qx) ** 2 + (py - qy) ** 2
            if d > best: best, bi = d, i
        if bi is not None and best > eps * eps:
            keep[bi] = True; stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]
def simp(g):
    t = g['type']
    if t == 'Polygon': g['coordinates'] = [r if len(r) < 8 else (lambda s: s if len(s) >= 4 else r)(rdp(r, tol)) for r in g['coordinates']]
    elif t == 'MultiPolygon': g['coordinates'] = [[r if len(r) < 8 else rdp(r, tol) for r in poly] for poly in g['coordinates']]
    elif t == 'LineString': g['coordinates'] = rdp(g['coordinates'], tol)
    elif t == 'GeometryCollection':
        for x in g['geometries']: simp(x)
d = json.load(open(src, encoding='utf-8'))
for L in d['camadas']:
    for f in L['features']: simp(f['geometry'])
json.dump(d, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
