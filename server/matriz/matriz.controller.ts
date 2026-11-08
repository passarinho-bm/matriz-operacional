import { Controller, Get, Header, Post, Query, StreamableFile } from '@nestjs/common';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { avisosGuarnicao, condutoresAuto, curtoGuarnicao, divisao, guarnicao, PO, resumoGuarnicao } from '../../shared/poder';
import { MatrizService } from './matriz.service';

const lim = (v: string | undefined, def: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : def;
};

/** Todos os endpoints são de leitura. Nada grava na planilha. */
@Controller('api')
export class MatrizController {
  constructor(private readonly svc: MatrizService) {}

  @Get('health')
  health() { return { status: 'ok' }; }

  @Get('status')
  status() { return this.svc.status(); }

  /** Pede uma leitura nova da planilha (ignora o cache). Não altera a planilha. */
  @Post('recarregar')
  async recarregar() {
    return this.svc.status(true);
  }

  @Get('matriz')
  matriz() { return this.svc.matriz(); }

  @Get('risco')
  risco() { return this.svc.risco(); }

  @Get('carga')
  carga() { return this.svc.carga(); }

  @Get('distancias')
  distancias() { return this.svc.distancias(); }

  @Get('parametros')
  parametros() { return this.svc.parametros(); }

  /** Dimensionamento do GBM e da ala. ?total=69&n=10&c=auto */
  @Get('poder-operacional')
  poder(@Query('total') total?: string, @Query('n') n?: string, @Query('c') c?: string) {
    const t = lim(total, PO.PADRAO, 30, 200);
    const div = divisao(t);
    const nn = lim(n, 10, 2, 14);
    const cc = c == null || c === 'auto' ? condutoresAuto(nn) : lim(c, 2, 0, 3);
    const g = guarnicao(nn, cc);
    return { divisao: div, ala: { n: nn, condutores: cc, auto: c == null || c === 'auto' }, guarnicao: g, resumo: resumoGuarnicao(g), curto: curtoGuarnicao(g), avisos: avisosGuarnicao(g, nn, cc) };
  }

  /** Camadas do KMZ já convertidas. Arquivo estático versionado, não vem da planilha. */
  @Get('mapa')
  @Header('Content-Type', 'application/json; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  mapa() {
    const candidatos = [join(process.cwd(), 'mapa.json'), join(__dirname, '../../../mapa.json'), join(__dirname, '../../../../mapa.json')];
    const arq = candidatos.find((p) => existsSync(p));
    if (!arq) throw new Error('mapa.json não encontrado.');
    return new StreamableFile(createReadStream(arq));
  }
}
