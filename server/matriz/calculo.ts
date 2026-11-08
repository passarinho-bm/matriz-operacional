import type { AbsRow, Comar, FrotaItem, Resumo } from '../../shared/types';

/** Regras de negócio da matriz, escritas uma vez. A tela só exibe. */

export const COMARS: Comar[] = ['Todos', 'I', 'II', 'III', 'IV'];
export const BASE = ['ur', 'ur_gsv', 'vme', 'vme2', 'apoio_ar'] as const;
export const INTER = ['vci', 'vs', 'vpa', 've', 'apoio'] as const;

type Viat = typeof BASE[number] | typeof INTER[number];

const soma = (rs: AbsRow[], c: keyof AbsRow) => rs.reduce((s, r) => s + ((r[c] as number | null) ?? 0), 0);
const conta = (rs: AbsRow[], cols: readonly Viat[]) => cols.reduce((s, c) => s + rs.filter((r) => r[c]).length, 0);

/** Agregados por recorte de COMAR (cartões da Visão geral). */
export function resumo(all: AbsRow[]): Resumo[] {
  return COMARS.map((comar) => {
    const rs = comar === 'Todos' ? all : all.filter((r) => r.comar === comar);
    const pior = rs
      .filter((r) => r.saldo_carga != null)
      .reduce<AbsRow | null>((a, r) => (a == null || (r.saldo_carga as number) < (a.saldo_carga as number) ? r : a), null);
    const neg = (c: 'saldo_efetivo' | 'saldo_considerado' | 'saldo_carga') => rs.filter((r) => r[c] != null && (r[c] as number) < 0).length;
    return {
      comar, gbms: rs.length,
      efetivo_necessario: soma(rs, 'efetivo_necessario'), efetivo_atual: soma(rs, 'efetivo_atual'), novo_efetivo: soma(rs, 'novo_efetivo'),
      saldo_efetivo: soma(rs, 'saldo_efetivo'), saldo_considerado: soma(rs, 'saldo_considerado'), saldo_carga: soma(rs, 'saldo_carga'),
      gbms_deficit_efetivo: neg('saldo_efetivo'), gbms_deficit_considerado: neg('saldo_considerado'), gbms_deficit_carga: neg('saldo_carga'),
      deficit_considerado: -rs.reduce((s, r) => s + Math.min(0, r.saldo_considerado ?? 0), 0),
      viaturas_base: conta(rs, BASE), viaturas_intermediario: conta(rs, INTER), viaturas: conta(rs, BASE) + conta(rs, INTER),
      pior_gbm_carga: pior ? pior.gbm : null, pior_saldo_carga: pior ? pior.saldo_carga : null,
    };
  });
}

/** Contagem de viaturas por posição e por modelo, por recorte de COMAR. */
export function frota(all: AbsRow[]): FrotaItem[] {
  const out: FrotaItem[] = [];
  for (const comar of COMARS) {
    const rs = comar === 'Todos' ? all : all.filter((r) => r.comar === comar);
    for (const categoria of [...BASE, ...INTER]) {
      const ms = rs.map((r) => r[categoria]).filter(Boolean);
      const por: Record<string, number> = {};
      ms.forEach((m) => { por[m] = (por[m] || 0) + 1; });
      const modelos = Object.entries(por)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([m, n]) => `${m} ${n}`).join(' · ');
      out.push({ comar, categoria, qtd: ms.length, gbms: rs.length, modelos: modelos || null });
    }
  }
  return out;
}
