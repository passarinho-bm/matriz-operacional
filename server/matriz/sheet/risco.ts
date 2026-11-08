import type { RiscoRow } from '../../../shared/types';
import { Grid, norm, numBR, semComar } from './util';

/** Aba Matriz de Risco: colunas pelo rótulo do cabeçalho. */
export function parseRisco(grid: Grid): RiscoRow[] {
  const hi = grid.findIndex((r) => r.some((c) => norm(c) === 'GBM') && r.some((c) => norm(c) === 'Coeficiente DOP'));
  if (hi < 0) throw new Error('O cabeçalho da aba Matriz de Risco não foi encontrado.');
  const h = grid[hi].map(norm);
  const at = (lab: string) => h.indexOf(lab);
  const after = (lab: string) => { const i = at(lab); return i < 0 ? -1 : i + 1; };
  const C: Record<string, number> = {
    comar: at('COMAR'), gbm: at('GBM'), q2: at('≤2 atend.'), q3: at('3 atend.'), q4: at('4+ atend.'), dop: at('Coeficiente DOP'), p_dop: after('Coeficiente DOP'),
    apoio: at('GBM de apoio'), dist: at('Distância (km)'), tmin: at('Tempo de chegada: min'), tseg: at('Tempo de chegada: s'), tapoio: at('Tempo de apoio (s)'), p_iso: after('Tempo de apoio (s)'),
    pop: at('População atendida'), renda: at('Renda per capita (R$)'), pdo: at('Coeficiente PDO'), p_pdo: after('Coeficiente PDO'),
    ext: at('Extensão da área (ha)'), edif: at('Edificações elevadas (> 12 m)'), risco: at('Risco da área (1 a 5)'),
    p_ext: at('Pontos: extensão'), p_edif: at('Pontos: edificações'), p_risco: at('Pontos: risco'), fd: at('Pontos (fator D)'),
    total: at('Pontuação total (ponderada)'), pos: at('Posição final (com empates)'), pos_trab: at('Posição no trabalho (Tabela 5)'),
  };
  const falta = ['gbm', 'p_dop', 'p_iso', 'p_pdo', 'fd', 'total'].filter((k) => C[k] < 0);
  if (falta.length) throw new Error('Colunas não encontradas na aba Matriz de Risco: ' + falta.join(', ') + '.');
  return grid.slice(hi + 1).filter((r) => norm(r[C.gbm]) !== '').map((r) => {
    const o: Record<string, unknown> = { gbm: norm(r[C.gbm]), comar: C.comar >= 0 ? semComar(r[C.comar]) : '', apoio: C.apoio >= 0 ? norm(r[C.apoio]) : '' };
    for (const k of Object.keys(C)) if (!(k in o)) o[k] = C[k] >= 0 ? numBR(r[C[k]]) : null;
    return o as unknown as RiscoRow;
  }).filter((o) => o.total != null);
}
