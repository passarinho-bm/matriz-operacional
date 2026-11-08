import type { AbsRow } from '@shared/types';

/** Linhas do recorte de COMAR, da maior para a menor pontuação de risco. */
export function linhas(all: AbsRow[], comar: string): AbsRow[] {
  const rs = all.filter((r) => comar === 'Todos' || r.comar === comar);
  return rs.map((r, i) => [r, i] as const).sort((a, b) => (b[0].matriz_risco ?? -1) - (a[0].matriz_risco ?? -1) || a[1] - b[1]).map((p) => p[0]);
}
/** GBM selecionado: o escolhido, se estiver no recorte, ou o primeiro. */
export function gbmSel(all: AbsRow[], comar: string, gbm: string | null): string | null {
  const rs = linhas(all, comar);
  const hit = rs.find((r) => r.gbm === gbm);
  return hit ? hit.gbm : rs[0] ? rs[0].gbm : null;
}
export const linhaSel = (all: AbsRow[], comar: string, gbm: string | null): AbsRow | null => {
  const g = gbmSel(all, comar, gbm);
  return all.find((r) => r.gbm === g) || null;
};
