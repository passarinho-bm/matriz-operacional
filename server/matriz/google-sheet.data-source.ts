import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AbsRow, CargaData, Params, RiscoRow } from '../../shared/types';
import type { MatrizDataSource } from './data-source';
import { parseAbsoluto } from './sheet/absoluto';
import { parseCarga } from './sheet/carga';
import { parseParams } from './sheet/params';
import { parseRisco } from './sheet/risco';
import { Grid, csvParseRows } from './sheet/util';

type Aba = 'absoluto' | 'risco' | 'carga' | 'params';

/** Fase 1: lê a planilha do Google publicada na Web (CSV). Somente leitura. */
@Injectable()
export class GoogleSheetDataSource implements MatrizDataSource {
  readonly nome = 'Planilha do Google';

  private readonly pub = process.env.SHEET_PUB_URL
    ?? 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmssdXmfVEAfDItEC90J5UhrDDD6dUIImcMKvxJQqkbiH6Vn92o4jXphHn1Ue58odgHp6KMCLSvXZX/pub';
  private readonly gids: Record<Aba, string> = {
    absoluto: process.env.SHEET_GID_ABSOLUTO ?? '1977235102',
    risco: process.env.SHEET_GID_RISCO ?? '1061038218',
    carga: process.env.SHEET_GID_CARGA ?? '1948092177',
    params: process.env.SHEET_GID_PARAMS ?? '1866811546',
  };
  private readonly localDir = process.env.SHEET_LOCAL_DIR;

  private url(aba: Aba) {
    return `${this.pub}?gid=${this.gids[aba]}&single=true&output=csv`;
  }

  private async ler(aba: Aba): Promise<Grid> {
    // Teste sem internet: t-absoluto.csv, t-risco.csv, t-carga.csv, t-params.csv.
    if (this.localDir) {
      const arq = join(this.localDir, `t-${aba}.csv`);
      try {
        return csvParseRows(await readFile(arq, 'utf8'));
      } catch {
        throw new Error(`Arquivo local não encontrado: t-${aba}.csv.`);
      }
    }
    let res: Response;
    try {
      res = await fetch(this.url(aba), { signal: AbortSignal.timeout(20_000) });
    } catch {
      throw new Error('Não foi possível alcançar o Google. Confira a conexão do servidor com docs.google.com.');
    }
    if (!res.ok) throw new Error(`O Google respondeu com o código ${res.status}. Confira se a planilha continua publicada na Web.`);
    const text = await res.text();
    if (/^\s*<(!doctype|html)/i.test(text)) throw new Error('O endereço não devolveu um CSV. Confira se a planilha foi publicada no formato CSV.');
    return csvParseRows(text);
  }

  async lerAbsoluto(): Promise<AbsRow[]> { return parseAbsoluto(await this.ler('absoluto')); }
  async lerRisco(): Promise<RiscoRow[]> { return parseRisco(await this.ler('risco')); }
  async lerCarga(): Promise<CargaData> { return parseCarga(await this.ler('carga')); }
  async lerParametros(): Promise<Params> { return parseParams(await this.ler('params')); }
}
