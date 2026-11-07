import { Inject, Injectable } from '@nestjs/common';
import type { AbaStatus, CargaData, Envelope, MatrizPayload, Params, RiscoRow, StatusPayload } from '../../shared/types';
import { frota, resumo } from './calculo';
import { MATRIZ_DATA_SOURCE, type MatrizDataSource } from './data-source';

type Aba = 'absoluto' | 'risco' | 'carga' | 'params';
interface Entrada<T> { dado: T | null; em: number | null; erro: string | null }

/**
 * Lê a fonte, guarda em cache de memória e monta as respostas.
 * Cada aba falha sozinha. Se a leitura nova falha e há cache, usa o cache e marca como obsoleto.
 */
@Injectable()
export class MatrizService {
  private readonly ttlMs = Number(process.env.SHEET_CACHE_SECONDS ?? 300) * 1000;
  private readonly cache: { [K in Aba]: Entrada<unknown> } = {
    absoluto: { dado: null, em: null, erro: null },
    risco: { dado: null, em: null, erro: null },
    carga: { dado: null, em: null, erro: null },
    params: { dado: null, em: null, erro: null },
  };
  private readonly voo = new Map<Aba, Promise<void>>();

  constructor(@Inject(MATRIZ_DATA_SOURCE) private readonly fonte: MatrizDataSource) {}

  private leitor(aba: Aba): () => Promise<unknown> {
    switch (aba) {
      case 'absoluto': return () => this.fonte.lerAbsoluto();
      case 'risco': return () => this.fonte.lerRisco();
      case 'carga': return () => this.fonte.lerCarga();
      default: return () => this.fonte.lerParametros();
    }
  }

  private async atualiza(aba: Aba, forcar: boolean): Promise<void> {
    const c = this.cache[aba];
    if (!forcar && c.dado != null && c.em != null && Date.now() - c.em < this.ttlMs) return;
    const emVoo = this.voo.get(aba);
    if (emVoo) return emVoo;
    const p = (async () => {
      try {
        c.dado = await this.leitor(aba)();
        c.em = Date.now();
        c.erro = null;
      } catch (e) {
        c.erro = e instanceof Error ? e.message : String(e);
      } finally {
        this.voo.delete(aba);
      }
    })();
    this.voo.set(aba, p);
    return p;
  }

  private async envelope<T, R = T>(aba: Aba, forcar: boolean, mapa: (d: T) => R): Promise<Envelope<R>> {
    await this.atualiza(aba, forcar);
    const c = this.cache[aba];
    const atualizadoEm = c.em ? new Date(c.em).toISOString() : null;
    if (c.dado == null) return { status: 'error', msg: c.erro ?? 'Sem dados.', atualizadoEm: null, obsoleto: false, data: null };
    return { status: 'ok', msg: c.erro ?? undefined, atualizadoEm, obsoleto: c.erro != null, data: mapa(c.dado as T) };
  }

  matriz(forcar = false) {
    return this.envelope<MatrizPayload['rows'], MatrizPayload>('absoluto', forcar, (rows) => ({ rows, resumo: resumo(rows), frota: frota(rows) }));
  }
  risco(forcar = false) { return this.envelope<RiscoRow[]>('risco', forcar, (d) => d); }
  carga(forcar = false) { return this.envelope<CargaData>('carga', forcar, (d) => d); }
  parametros(forcar = false) { return this.envelope<Params>('params', forcar, (d) => d); }

  async distancias(forcar = false): Promise<Envelope<{ dist: Params['dist']; tempo: Params['tempo'] }>> {
    const e = await this.parametros(forcar);
    if (e.status === 'error' || !e.data) return { ...e, data: null };
    if (!e.data.dist && !e.data.tempo) return { status: 'error', msg: 'As tabelas de distância e de tempo não foram encontradas na aba Parâmetros.', atualizadoEm: e.atualizadoEm, obsoleto: e.obsoleto, data: null };
    return { ...e, data: { dist: e.data.dist, tempo: e.data.tempo } };
  }

  async status(forcar = false): Promise<StatusPayload> {
    const abas: Aba[] = ['absoluto', 'risco', 'carga', 'params'];
    await Promise.all(abas.map((a) => this.atualiza(a, forcar)));
    const lista: AbaStatus[] = abas.map((aba) => {
      const c = this.cache[aba];
      return {
        aba,
        status: c.dado != null ? 'ok' : 'error',
        msg: c.erro ?? undefined,
        atualizadoEm: c.em ? new Date(c.em).toISOString() : null,
        obsoleto: c.dado != null && c.erro != null,
      };
    });
    const tempos = lista.map((l) => l.atualizadoEm).filter((x): x is string => !!x).sort();
    return { abas: lista, atualizadoEm: tempos.length ? tempos[tempos.length - 1] : null, fonte: this.fonte.nome, cacheSegundos: this.ttlMs / 1000 };
  }
}
