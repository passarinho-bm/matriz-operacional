import * as d3 from 'd3';

export const loc = d3.formatLocale({ decimal: ',', thousands: '.', grouping: [3], currency: ['R$ ', ''], minus: '−' });
export const fInt = loc.format(',d');
export const fSig = loc.format('+,d');
export const f2 = loc.format(',.2f');
export const f1 = loc.format(',.1f');

export type Kind = 'int' | 'signed' | 'dec2' | 'ord' | 'text';

export const KIND: Record<string, Kind> = {
  efetivo_necessario: 'int', efetivo_atual: 'int', novo_efetivo: 'int', cotas_gsv: 'int', ralvo: 'int',
  saldo_efetivo: 'signed', saldo_considerado: 'signed', saldo_carga: 'signed', pior_saldo_carga: 'signed',
  coef_ajuste: 'dec2', matriz_risco: 'dec2', carga_atual: 'dec2', carga_atualizada: 'dec2',
  rk_ocorrencias: 'ord', rk_ur: 'ord', rk_multiemprego: 'ord', rk_multiemprego_florestal: 'ord', rk_incendio: 'ord',
};
export const kindOf = (c: string): Kind => KIND[c] || 'text';

export const fmt = (kind: Kind | string | undefined, v: unknown): string => {
  if (v == null || v === '') return '';
  if (kind === 'signed') return v === 0 ? '0' : fSig(v as number);
  if (kind === 'dec2') return f2(v as number);
  if (kind === 'ord') return typeof v === 'number' ? fInt(v) + 'º' : String(v);
  if (typeof v === 'number') return Number.isInteger(v) ? fInt(v) : f2(v);
  return String(v);
};

export const norm = (s: unknown): string => String(s ?? '').replace(/[\s​﻿]+/g, ' ').trim();
export const fold = (s: unknown): string => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const COMARS = ['Todos', 'I', 'II', 'III', 'IV'] as const;
export const BASE = ['ur', 'ur_gsv', 'vme', 'vme2', 'apoio_ar'] as const;
export const INTER = ['vci', 'vs', 'vpa', 've', 'apoio'] as const;

export const GUARNECIDAS = ['vme', 'vme2', 'vci', 'vs', 'vpa', 've', 'apoio'] as const;

/** Naturezas de ocorrência e as viaturas que cada uma orienta. */
export interface Nat { k: string; slug: string; nome: string; curto: string; cor: string; alvo: string; viat: (col: string, m: string) => boolean }
export const NATS: Nat[] = [
  { k: 'rk_ur', slug: 'ur', nome: 'unidade de resgate (UR)', curto: 'UR', cor: '--n1', alvo: 'UR', viat: (col) => col === 'ur' || col === 'ur_gsv' },
  { k: 'rk_multiemprego', slug: 'multiemprego', nome: 'multiemprego', curto: 'Multiemprego', cor: '--n2', alvo: 'ABSL ou AR', viat: (col, m) => (GUARNECIDAS as readonly string[]).includes(col) && (m === 'ABSL' || m === 'AR') },
  { k: 'rk_multiemprego_florestal', slug: 'florestal', nome: 'multiemprego com florestal', curto: 'Multiemprego c/ florestal', cor: '--n3', alvo: 'ABSL ou AR', viat: (col, m) => (GUARNECIDAS as readonly string[]).includes(col) && (m === 'ABSL' || m === 'AR') },
  { k: 'rk_incendio', slug: 'incendio', nome: 'incêndio estrutural', curto: 'Incêndio estrutural', cor: '--n4', alvo: 'ASE ou ABT', viat: (col, m) => (GUARNECIDAS as readonly string[]).includes(col) && (m === 'ASE' || m === 'ABT') },
];
export const natOf = (k: string): Nat => NATS.find((n) => n.k === k) || NATS[0];

/** Siglas e nomes das viaturas do CBMDF. */
export const SIGLAS: Record<string, string> = {
  UR: 'Unidade de Resgate', ASE: 'Auto Salvamento e Extinção', ABT: 'Auto Bomba Tanque', ABSL: 'Auto Busca e Salvamento Leve',
  AR: 'Auto Rápido', AEM: 'Auto Escada Mecânica', AT: 'Auto Tanque', APSG: 'Auto Plataforma de Serviços Gerais',
};
export const ICONE: Record<string, string> = { UR: 'i-ur', ASE: 'i-ase', ABT: 'i-abt', ABSL: 'i-absl', AR: 'i-ar', AEM: 'i-aem', AT: 'i-at', APSG: 'i-apsg' };
export const siglasDe = (m: string): string[] => String(m).toUpperCase().replace(/\(.*?\)/g, ' ').split(/[^A-Z]+/).filter((x) => SIGLAS[x]);
export const iconeDe = (m: string): string => ICONE[siglasDe(m)[0]] || 'i-ase';
export const nomeViatura = (m: string): string => {
  const linhas = siglasDe(m).map((x) => `${x}: ${SIGLAS[x]}`);
  if (/GSV/i.test(m)) linhas.push('Guarnição por GSV (reforço).');
  return linhas.length ? linhas.join('\n') : String(m);
};
