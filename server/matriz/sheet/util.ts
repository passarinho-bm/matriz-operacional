/** Utilitários de leitura da planilha. Fica tudo dentro da camada da planilha (Fase 1). */

export type Grid = string[][];

/** Lê CSV (RFC 4180): aspas, vírgulas e quebras de linha dentro de campo. */
export function csvParseRows(text: string): Grid {
  const rows: Grid = [];
  let row: string[] = [];
  let cel = '';
  let aspas = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (aspas) {
      if (c === '"') {
        if (src[i + 1] === '"') { cel += '"'; i++; } else aspas = false;
      } else cel += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') { row.push(cel); cel = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cel); cel = '';
      rows.push(row); row = [];
    } else cel += c;
  }
  if (cel !== '' || row.length) { row.push(cel); rows.push(row); }
  return rows;
}

export const norm = (s: unknown): string => String(s ?? '').replace(/[\s​﻿]+/g, ' ').trim();
export const fold = (s: unknown): string => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** Chave de comparação de cabeçalho: sem acento, minúsculas, só letras e dígitos. */
export const chave = (s: unknown): string => fold(norm(s)).replace(/[^a-z0-9]+/g, '');

/** Número no formato brasileiro («1.234,5», «+3», «−2», «3º», «R$ 10,00»). */
export function numBR(x: unknown): number | null {
  if (typeof x === 'number') return Number.isFinite(x) ? x : null;
  const t = norm(x).replace(/R\$\s*/g, '').replace(/[º°ª]/g, '').replace(/\./g, '').replace(',', '.').replace(/^\+/, '').replace('−', '-');
  if (t === '' || t === '-') return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

export const semComar = (c: unknown): string => norm(c).replace(/^COMAR\s+/i, '');
