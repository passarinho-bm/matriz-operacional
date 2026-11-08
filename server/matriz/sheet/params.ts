import type { MatrizDist, Params } from '../../../shared/types';
import { Grid, fold, norm, numBR } from './util';

/** Aba Parâmetros: lida por rótulos (classes, pesos, limites do fator D, constantes, matrizes). */
export function parseParams(grid: Grid): Params {
  const A = (r: string[]) => norm(r[0]);
  const idx = (pred: (r: string[]) => boolean) => grid.findIndex(pred);
  const P: Params = { fonte: null, cotaFator: null, ofBase: null, ofPct: null, dist: null, tempo: null };
  const fonte = grid.find((r) => /^Fonte: Anexo/i.test(A(r)));
  P.fonte = fonte ? A(fonte).replace(/\s*\(documento anexado[^)]*\)\.?/i, '.') : null;
  let i = idx((r) => A(r) === 'Complexidade');
  if (i >= 0) P.beta = grid.slice(i + 1, i + 4).map((r) => ({ nome: norm(r[0]), faixa: norm(r[1]), b: numBR(r[3]) }));
  i = idx((r) => A(r) === 'Pontos' && norm(r[1]) === 'DOP');
  if (i >= 0) P.classes = grid.slice(i + 1, i + 7).map((r) => ({ p: numBR(r[0]), dop: numBR(r[1]), iso: numBR(r[2]), pdo: numBR(r[3]), cDop: norm(r[4]), cIso: norm(r[5]), cPdo: norm(r[6]) })).filter((c) => c.p != null);
  i = idx((r) => A(r) === 'Critério' && norm(r[1]) === 'Peso');
  if (i >= 0) {
    P.pesos = {};
    for (const r of grid.slice(i + 1, i + 8)) {
      const k = fold(A(r));
      if (!k) break;
      const w = numBR(r[1]);
      if (k.startsWith('demanda')) P.pesos.dop = w;
      else if (k.startsWith('isolamento')) P.pesos.iso = w;
      else if (k.startsWith('potencial')) P.pesos.pdo = w;
      else if (k.startsWith('caracteristicas') || k.startsWith('riscos')) P.pesos.fd = w;
      else if (k.startsWith('carga')) P.pesos.carga = w;
    }
  }
  i = idx((r) => A(r) === 'Pontos' && fold(norm(r[1])).startsWith('extensao'));
  if (i >= 0) P.fdLim = grid.slice(i + 1, i + 7).map((r) => ({ p: numBR(r[0]), ext: numBR(r[1]), edif: numBR(r[2]) })).filter((c) => c.p != null);
  i = idx((r) => A(r) === 'Nível' && norm(r[1]) === 'Pontos');
  if (i >= 0) P.riscoNivel = grid.slice(i + 1, i + 6).map((r) => ({ n: numBR(r[0]), p: numBR(r[1]) })).filter((c) => c.n != null);
  i = idx((r) => A(r) === 'Subcritério');
  if (i >= 0) P.fdPesos = grid.slice(i + 1, i + 4).map((r) => ({ nome: norm(r[0]), w: numBR(r[1]) }));
  const kv = (test: (t: string) => boolean): string | null => {
    for (const r of grid) for (let j = 0; j < r.length - 1; j++) if (test(fold(norm(r[j])))) return norm(r[j + 1]);
    return null;
  };
  P.cotaFator = numBR(kv((t) => t.startsWith('fator multiplicador da cota gsv')));
  P.ofBase = numBR(kv((t) => t.startsWith('adicional oficial de dia') && t.includes('base')));
  const pct = kv((t) => t.startsWith('adicional oficial de dia') && t.includes('acrescimo'));
  P.ofPct = pct == null ? null : (numBR(pct.replace('%', '')) ?? 0) / (pct.includes('%') ? 100 : 1);
  const matriz = (pref: string): MatrizDist | null => {
    const k = grid.findIndex((r) => fold(A(r)).startsWith(pref));
    if (k < 0 || !grid[k + 1] || norm(grid[k + 1][0]) !== 'GBM') return null;
    const cols = grid[k + 1].slice(1).map(norm);
    while (cols.length && !cols[cols.length - 1]) cols.pop();
    const rows: MatrizDist['rows'] = [];
    for (let j = k + 2; j < grid.length; j++) {
      const nome = norm(grid[j][0]);
      if (!nome) break;
      rows.push({ nome, v: cols.map((_, c) => numBR(grid[j][c + 1])) });
    }
    return rows.length ? { cols, rows } : null;
  };
  P.dist = matriz('distancia entre gbms');
  P.tempo = matriz('tempo de deslocamento entre gbms');
  return P;
}
