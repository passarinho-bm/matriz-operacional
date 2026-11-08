/**
 * Poder operacional: regras de guarnição do Comando Operacional.
 * Usado pela API e pela tela. As regras ficam só aqui.
 * O adjunto de serviço não entra na conta.
 */

export const PO = { EXP: 6, SECOM: 5, UR: 15, PADRAO: 69, ALAS: ['Alfa', 'Bravo', 'Charlie', 'Delta'] as const };

export type Capacete = 'h1' | 'h2'; // h2 = condutor (QBMG-2), h1 = operacional (QBMG-1)

export interface Ala { nome: string; n: number }
export interface DivisaoEfetivo { total: number; expediente: number; secom: number; escalaUr: number; resto: number; alas: Ala[] }

export interface Guarnicao {
  n: number; c: number; k: number; ase: number[]; asesCrew: Capacete[][];
  ar: number; arCond: boolean; arCrew: Capacete[]; reserva: number; reservaCrew: Capacete[]; falta2Cond: boolean;
}

/** GBM de 69 = 6 expediente + 5 SECOM + 15 escala de UR + 43 nas 4 alas. */
export function divisao(total: number): DivisaoEfetivo {
  const expediente = Math.min(PO.EXP, total);
  const secom = Math.min(PO.SECOM, Math.max(0, total - PO.EXP));
  const escalaUr = Math.min(PO.UR, Math.max(0, total - PO.EXP - PO.SECOM));
  const resto = Math.max(0, total - PO.EXP - PO.SECOM - PO.UR);
  const base = Math.floor(resto / 4);
  const x = resto % 4;
  return { total, expediente, secom, escalaUr, resto, alas: PO.ALAS.map((nome, i) => ({ nome, n: base + (i < x ? 1 : 0) })) };
}

/** n bombeiros na ala, c condutores (QBMG-2). ASE padrão 5, exceção 4. Dois ASE a partir de 8. AR de 2 a 4. */
export function guarnicao(n: number, c: number): Guarnicao {
  c = Math.max(0, Math.min(c, n));
  let k = 0;
  while (k < 2 && k + 1 <= c && 4 * (k + 1) <= n) k++;
  let R = n - 4 * k;
  const ase = Array.from({ length: k }, () => 4);
  let ar = 0;
  if (k <= 1 && R >= 2) { ar = 2; R -= 2; }
  for (let i = 0; i < k && R > 0; i++) { ase[i]++; R--; }
  if (k === 2 && ar === 0 && R >= 2) { ar = 2; R -= 2; }
  if (ar > 0) { const add = Math.min(R, 4 - ar); ar += add; R -= add; }
  const arCond = ar > 0 && c - k > 0;
  let condLivre = c - k - (arCond ? 1 : 0);
  let q1Livre = n - c;
  const seat = (): Capacete => { if (q1Livre > 0) { q1Livre--; return 'h1'; } condLivre--; return 'h2'; };
  const asesCrew = ase.map((tot) => ['h2' as Capacete, ...Array.from({ length: tot - 1 }, seat)]);
  const arCrew: Capacete[] = ar ? [arCond ? 'h2' : seat(), ...Array.from({ length: ar - 1 }, seat)] : [];
  const reservaCrew: Capacete[] = [
    ...Array.from({ length: Math.max(0, condLivre) }, () => 'h2' as Capacete),
    ...Array.from({ length: Math.max(0, q1Livre) }, () => 'h1' as Capacete),
  ];
  return { n, c, k, ase, asesCrew, ar, arCond, arCrew, reserva: R, reservaCrew, falta2Cond: k < 2 && n >= 4 * (k + 1) && c <= k };
}

/** Condutores no modo automático: 1 por viatura. */
export const condutoresAuto = (n: number): number => { const g = guarnicao(n, 3); return g.k + (g.ar ? 1 : 0); };

export function resumoGuarnicao(g: Guarnicao): string {
  if (!g.k) return g.ar ? 'Só a AR, sem ASE' : 'Sem ASE';
  const exc = g.ase.filter((t) => t < 5).length;
  const ases = g.k === 2
    ? (exc === 0 ? '2 ASE no padrão' : exc === 1 ? '2 ASE, um em exceção' : '2 ASE em exceção')
    : (exc ? 'ASE em exceção' : 'ASE no padrão');
  return g.ar ? `${ases} e AR` : ases;
}

export function curtoGuarnicao(g: Guarnicao): string {
  if (!g.k) return g.ar ? 'só AR' : 'sem ASE';
  const exc = g.ase.filter((t) => t < 5).length;
  const s = g.k === 2 ? (exc === 2 ? '2 ASE exc.' : '2 ASE') : exc ? 'ASE exc.' : 'ASE';
  return g.ar ? s + ' + AR' : s;
}

export type Aviso = ['ok' | 'warn' | 'bad', string];

export function avisosGuarnicao(g: Guarnicao, n: number, cEf: number): Aviso[] {
  const msgs: Aviso[] = [];
  if (!g.k && n < 4) msgs.push(['bad', `Com ${n} bombeiros, a ala não ativa o ASE. Mínimo: 4, com 1 condutor (QBMG-2).`]);
  else if (!g.k && cEf === 0) msgs.push(['bad', 'Sem condutor (QBMG-2), o ASE não sai.']);
  if (g.ase.some((t) => t < 5)) msgs.push(['warn', g.k === 2 && g.ase.every((t) => t < 5) ? 'Os 2 ASE saem em exceção: 4 bombeiros cada. Padrão: 5.' : '1 ASE sai em exceção: 4 bombeiros. Padrão: 5.']);
  if (g.ar && !g.arCond) msgs.push(['warn', 'Um QBMG-1 conduz a AR. A AR faz só deslocamento não emergencial.']);
  if (g.falta2Cond) msgs.push(['bad', 'Há efetivo para o 2º ASE. Falta o 2º condutor (QBMG-2).']);
  if (g.k === 2 && g.ase.every((t) => t >= 5)) msgs.push(['ok', 'Configuração ideal: 2 ASE com 5 bombeiros cada.']);
  if (g.k === 1 && g.ase[0] >= 5 && !g.ar && n === 5) msgs.push(['ok', 'ASE no padrão: 1 condutor e 4 operacionais.']);
  return msgs;
}
