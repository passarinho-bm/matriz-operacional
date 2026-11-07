import type { AbsRow } from '../../../shared/types';
import { Grid, chave, norm, numBR } from './util';

const NOMES: Record<string, keyof AbsRow> = {
  'GBM': 'gbm', 'COMAR': 'comar', 'UR': 'ur', 'UR (GSV) / Reforço': 'ur_gsv', 'VME': 'vme', '2ª VME': 'vme2',
  'Apoio AR': 'apoio_ar', 'VCI': 'vci', 'VS': 'vs', 'VPA': 'vpa', 'VE': 've', 'Apoio': 'apoio',
  'Efetivo Necessário (com 30% de afast.)': 'efetivo_necessario', 'Efetivo Atual': 'efetivo_atual',
  'Saldo Efetivo': 'saldo_efetivo', 'Oficial de Dia': 'oficial_dia', 'Cotas diárias de GSV 12h': 'cotas_gsv',
  'Saldo Considerado': 'saldo_considerado', 'Relação Alvo (Ralvo)': 'ralvo', 'Coeficiente de Ajuste': 'coef_ajuste',
  'Novo Efetivo Necessário': 'novo_efetivo', 'Saldo Efetivo pelo Índice de Carga Operacional': 'saldo_carga',
  'Matriz de Risco': 'matriz_risco', 'Carga Operacional com Efetivo Atual': 'carga_atual',
  'Carga Operacional - Atualizada': 'carga_atualizada',
  'Ranking Ocorrências': 'rk_ocorrencias', 'Ranking UR': 'rk_ur', 'Ranking Multiemprego': 'rk_multiemprego',
  'Ranking Multiemprego c/ florestal': 'rk_multiemprego_florestal', 'Ranking Incêndio estrutural': 'rk_incendio',
};
const OPCIONAIS = new Set<string>(['rk_ocorrencias', 'rk_ur', 'rk_multiemprego', 'rk_multiemprego_florestal', 'rk_incendio']);
const TEXTO = new Set<string>(['gbm', 'comar']);
const ICONE = new Set<string>(['ur', 'ur_gsv', 'vme', 'vme2', 'apoio_ar', 'vci', 'vs', 'vpa', 've', 'apoio', 'oficial_dia']);
const semIcone = (s: unknown) => norm(s).replace(/^[^\p{L}\p{N}]+/u, '').trim();

/** Aba Absoluto: acha cada coluna pelo nome do cabeçalho, nunca pela posição. */
export function parseAbsoluto(grid: Grid): AbsRow[] {
  const hi = grid.findIndex((r) => r.some((c) => norm(c) === 'GBM') && r.some((c) => norm(c) === 'COMAR'));
  if (hi < 0) throw new Error('O cabeçalho da aba Absoluto (colunas GBM e COMAR) não foi encontrado no CSV.');
  const header = grid[hi].map(chave);
  const iNum = grid[hi].findIndex((c) => ['#', 'nº', 'n°', 'no', 'num', 'número', 'numero'].includes(norm(c).toLowerCase()));
  const pos: Record<string, number> = {};
  const faltam: string[] = [];
  for (const [rotulo, k] of Object.entries(NOMES)) {
    const i = header.indexOf(chave(rotulo));
    if (i >= 0) pos[k] = i;
    else if (!OPCIONAIS.has(k)) faltam.push(rotulo);
  }
  if (faltam.length) throw new Error('Colunas não encontradas: ' + faltam.join('; ') + '.');
  return grid.slice(hi + 1)
    .filter((r) => norm(r[pos.gbm]) !== '' && norm(r[pos.gbm]).toUpperCase() !== 'TOTAL')
    .map((r) => {
      const o: Record<string, unknown> = {};
      for (const c of Object.values(NOMES) as string[]) {
        const cel = pos[c] == null ? '' : r[pos[c]];
        if (TEXTO.has(c)) o[c] = norm(cel);
        else if (OPCIONAIS.has(c)) o[c] = pos[c] == null ? null : numBR(String(cel ?? '').replace(/[º°ª]/g, ''));
        else if (ICONE.has(c)) o[c] = semIcone(cel);
        else o[c] = numBR(cel);
      }
      o.numero = iNum >= 0 ? numBR(r[iNum]) : null;
      return o as unknown as AbsRow;
    });
}
