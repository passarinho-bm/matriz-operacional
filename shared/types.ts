/** Contrato de dados entre a fonte (planilha hoje, SQL na Fase 2), a API e a tela. */

export type Comar = 'Todos' | 'I' | 'II' | 'III' | 'IV';

/** Linha da aba Absoluto (uma por GBM). */
export interface AbsRow {
  numero: number | null;
  gbm: string;
  comar: string;
  // viaturas (modelo da viatura, vazio quando não há)
  ur: string; ur_gsv: string; vme: string; vme2: string; apoio_ar: string;
  vci: string; vs: string; vpa: string; ve: string; apoio: string;
  oficial_dia: string;
  efetivo_necessario: number | null; efetivo_atual: number | null; saldo_efetivo: number | null;
  cotas_gsv: number | null; saldo_considerado: number | null; ralvo: number | null; coef_ajuste: number | null;
  novo_efetivo: number | null; saldo_carga: number | null; matriz_risco: number | null;
  carga_atual: number | null; carga_atualizada: number | null;
  rk_ocorrencias: number | null; rk_ur: number | null; rk_multiemprego: number | null;
  rk_multiemprego_florestal: number | null; rk_incendio: number | null;
}

export type AbsNumKey = Exclude<{ [K in keyof AbsRow]: AbsRow[K] extends number | null ? K : never }[keyof AbsRow], never>;

/** Linha da aba Matriz de Risco. */
export interface RiscoRow {
  gbm: string; comar: string; apoio: string;
  q2: number | null; q3: number | null; q4: number | null; dop: number | null; p_dop: number | null;
  dist: number | null; tmin: number | null; tseg: number | null; tapoio: number | null; p_iso: number | null;
  pop: number | null; renda: number | null; pdo: number | null; p_pdo: number | null;
  ext: number | null; edif: number | null; risco: number | null;
  p_ext: number | null; p_edif: number | null; p_risco: number | null; fd: number | null;
  total: number | null; pos: number | null; pos_trab: number | null;
}

export interface CargaNat { oc: number | null; rk: number | null; pm: number | null; rkpm: number | null }
export interface CargaRow {
  gbm: string; comar: string; lot: number | null; oc: number | null; carga: number | null; indice: number | null;
  aph: CargaNat | null; multi: CargaNat | null; inc: CargaNat | null;
}
export interface CargaData { rows: CargaRow[]; total: CargaRow | null }

export interface MatrizDist { cols: string[]; rows: { nome: string; v: (number | null)[] }[] }
export interface Params {
  fonte: string | null;
  beta?: { nome: string; faixa: string; b: number | null }[];
  classes?: { p: number | null; dop: number | null; iso: number | null; pdo: number | null; cDop: string; cIso: string; cPdo: string }[];
  pesos?: { dop?: number | null; iso?: number | null; pdo?: number | null; fd?: number | null; carga?: number | null };
  fdLim?: { p: number | null; ext: number | null; edif: number | null }[];
  riscoNivel?: { n: number | null; p: number | null }[];
  fdPesos?: { nome: string; w: number | null }[];
  cotaFator: number | null; ofBase: number | null; ofPct: number | null;
  dist: MatrizDist | null; tempo: MatrizDist | null;
}

/** Agregados por recorte de COMAR (calculados no servidor). */
export interface Resumo {
  comar: Comar; gbms: number;
  efetivo_necessario: number; efetivo_atual: number; novo_efetivo: number;
  saldo_efetivo: number; saldo_considerado: number; saldo_carga: number;
  gbms_deficit_efetivo: number; gbms_deficit_considerado: number; gbms_deficit_carga: number;
  deficit_considerado: number;
  viaturas_base: number; viaturas_intermediario: number; viaturas: number;
  pior_gbm_carga: string | null; pior_saldo_carga: number | null;
}
export interface FrotaItem { comar: Comar; categoria: string; qtd: number; gbms: number; modelos: string | null }

export interface MatrizPayload { rows: AbsRow[]; resumo: Resumo[]; frota: FrotaItem[] }

/** Envelope de cada aba: um erro numa aba não derruba as outras. */
export interface Envelope<T> {
  status: 'ok' | 'error';
  msg?: string;
  /** ISO da última leitura bem-sucedida. */
  atualizadoEm: string | null;
  /** true quando os dados vêm do cache por falha na leitura nova. */
  obsoleto: boolean;
  data: T | null;
}

export interface AbaStatus { aba: string; status: 'ok' | 'error'; msg?: string; atualizadoEm: string | null; obsoleto: boolean }
export interface StatusPayload { abas: AbaStatus[]; atualizadoEm: string | null; fonte: string; cacheSegundos: number }
