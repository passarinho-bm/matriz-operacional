import type { CargaData, CargaRow } from '../../../shared/types';
import { Grid, fold, norm, numBR, semComar } from './util';

/** Aba Carga Operacional. */
export function parseCarga(grid: Grid): CargaData {
  const hi = grid.findIndex((r) => r.some((c) => norm(c) === 'GBM') && r.some((c) => norm(c).startsWith('Militares lotados')));
  if (hi < 0) throw new Error('O cabeçalho da aba Carga Operacional não foi encontrado.');
  const h = grid[hi].map(norm);
  const g = (grid[hi - 1] || []).map((c) => fold(norm(c)));
  const C = {
    gbm: h.indexOf('GBM'), comar: h.indexOf('COMAR'), lot: h.findIndex((c) => c.startsWith('Militares lotados')), oc: h.indexOf('Ocorrências'),
    carga: h.findIndex((c) => c.startsWith('Ocorrências / Militares lotados')), indice: h.findIndex((c) => c.startsWith('Índice de Carga')),
  };
  if (C.gbm < 0 || C.oc < 0 || C.carga < 0) throw new Error('Colunas não encontradas na aba Carga Operacional.');
  const nat = { aph: g.findIndex((c) => c.startsWith('aph')), multi: g.findIndex((c) => c.startsWith('multiemprego')), inc: g.findIndex((c) => c.startsWith('incendio')) };
  const linha = (r: string[]): CargaRow => {
    const o: Record<string, unknown> = {
      gbm: norm(r[C.gbm]), comar: C.comar >= 0 ? semComar(r[C.comar]) : '', lot: numBR(r[C.lot]), oc: numBR(r[C.oc]), carga: numBR(r[C.carga]),
      indice: C.indice >= 0 ? numBR(r[C.indice]) : null,
    };
    for (const [k, i] of Object.entries(nat)) {
      o[k] = i < 0 ? null : { oc: numBR(r[i]), rk: numBR(r[i + 1]), pm: numBR(r[i + 2]), rkpm: numBR(r[i + 3]) };
    }
    return o as unknown as CargaRow;
  };
  const body = grid.slice(hi + 1).filter((r) => norm(r[C.gbm]) !== '');
  const tot = body.find((r) => fold(norm(r[C.gbm])) === 'total');
  return { rows: body.filter((r) => r !== tot).map(linha).filter((o) => o.carga != null), total: tot ? linha(tot) : null };
}
