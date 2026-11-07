import * as d3 from 'd3';
import type { AbsRow } from '@shared/types';
import { fmt } from '../format';
import { makeSvg, measure, rowEvents, tipFor } from './base';

interface Ctx { all: AbsRow[]; rs: AbsRow[]; sel: string | null; onPick: (g: string) => void }

export function drawRanking(el: HTMLElement, { all, rs, sel, onPick }: Ctx) {
  const W = Math.max(260, el.clientWidth), rowH = 26, barH = 16, padT = 2;
  const H = rs.length * rowH + padT * 2;
  el.style.minHeight = H + 'px';
  const svg = makeSvg(el, W, H, 'Ranking dos GBMs pela pontuação da matriz de risco');
  const comarW = measure(svg, rs.map((r) => r.comar), 'mo-t-muted') + 10;
  const nameW = Math.min(W * 0.48, measure(svg, rs.map((r) => r.gbm), 'mo-t'));
  const valW = measure(svg, rs.map((r) => fmt('dec2', r.matriz_risco)), 'mo-t-muted') + 8;
  const x0 = comarW + nameW + 10;
  const x = d3.scaleLinear([0, d3.max(all, (d) => d.matriz_risco) || 1], [x0, W - valW]);
  const tip = tipFor(el);
  const g = svg.append('g').selectAll('g').data(rs).join('g')
    .attr('class', (d) => 'mo-row' + (d.gbm === sel ? ' is-sel' : ''))
    .attr('transform', (_d, i) => `translate(0,${padT + i * rowH})`)
    .attr('aria-label', (d) => `${d.gbm}, matriz de risco ${fmt('dec2', d.matriz_risco)}`);
  g.append('rect').attr('class', 'mo-hit').attr('width', W).attr('height', rowH).attr('rx', 4);
  g.append('text').attr('class', 'mo-t-muted').attr('x', 2).attr('y', rowH / 2).attr('dy', '0.35em').text((d) => d.comar);
  g.append('text').attr('class', 'mo-t').attr('x', comarW).attr('y', rowH / 2).attr('dy', '0.35em').text((d) => d.gbm);
  g.append('rect').attr('class', 'mo-bar mo-bar-acc').attr('x', x0).attr('y', (rowH - barH) / 2).attr('height', barH).attr('rx', 3)
    .attr('width', (d) => Math.max(0, x(d.matriz_risco ?? 0) - x0));
  g.append('text').attr('class', 'mo-t-muted').attr('x', (d) => x(d.matriz_risco ?? 0) + 6).attr('y', rowH / 2).attr('dy', '0.35em')
    .text((d) => fmt('dec2', d.matriz_risco));
  rowEvents(g, el, tip, (d: AbsRow) => [
    { t: 'COMAR ' + d.comar, cls: 'mo-tip-h' }, { t: d.gbm, cls: 'mo-tip-b' },
    { t: 'Matriz de risco: ' + fmt('dec2', d.matriz_risco) },
    { t: 'Carga com efetivo atual: ' + fmt('dec2', d.carga_atual) },
    { t: 'Saldo considerado: ' + fmt('signed', d.saldo_considerado) },
  ], onPick);
}

export function drawSaldos(el: HTMLElement, { all, rs: base, sel, onPick }: Ctx, m: 'saldo_efetivo' | 'saldo_considerado' | 'saldo_carga') {
  const rs = base.filter((r) => r[m] != null).sort((a, b) => (a[m] as number) - (b[m] as number) || a.gbm.localeCompare(b.gbm));
  const W = Math.max(260, el.clientWidth), rowH = 24, barH = 14, padT = 2;
  const H = rs.length * rowH + padT * 2;
  el.style.minHeight = H + 'px';
  const svg = makeSvg(el, W, H, 'Saldo de efetivo por GBM');
  const nameW = Math.min(W * 0.45, measure(svg, rs.map((r) => r.gbm), 'mo-t'));
  const valW = measure(svg, all.map((r) => fmt('signed', r[m])), 'mo-t-muted') + 8;
  const x0 = nameW + 12;
  const M = d3.max(all, (d) => Math.abs(d[m] ?? 0)) || 1;
  const x = d3.scaleLinear([-M, M], [x0 + valW, W - valW]);
  svg.append('line').attr('class', 'mo-axis').attr('x1', x(0)).attr('x2', x(0)).attr('y1', 0).attr('y2', H);
  const tip = tipFor(el);
  const v = (d: AbsRow) => d[m] as number;
  const g = svg.append('g').selectAll('g').data(rs).join('g')
    .attr('class', (d) => 'mo-row' + (d.gbm === sel ? ' is-sel' : ''))
    .attr('transform', (_d, i) => `translate(0,${padT + i * rowH})`)
    .attr('aria-label', (d) => `${d.gbm}, ${fmt('signed', d[m])}`);
  g.append('rect').attr('class', 'mo-hit').attr('width', W).attr('height', rowH).attr('rx', 4);
  g.append('text').attr('class', 'mo-t').attr('x', 2).attr('y', rowH / 2).attr('dy', '0.35em').text((d) => d.gbm);
  g.append('rect').attr('class', (d) => 'mo-bar ' + (v(d) < 0 ? 'mo-bar-neg' : 'mo-bar-pos'))
    .attr('x', (d) => Math.min(x(0), x(v(d)))).attr('y', (rowH - barH) / 2).attr('height', barH).attr('rx', 3)
    .attr('width', (d) => Math.abs(x(v(d)) - x(0)));
  g.append('text').attr('class', 'mo-t-muted').attr('y', rowH / 2).attr('dy', '0.35em')
    .attr('x', (d) => (v(d) < 0 ? x(v(d)) - 5 : x(v(d)) + 5)).attr('text-anchor', (d) => (v(d) < 0 ? 'end' : 'start'))
    .text((d) => fmt('signed', d[m]));
  rowEvents(g, el, tip, (d: AbsRow) => [
    { t: 'COMAR ' + d.comar, cls: 'mo-tip-h' }, { t: d.gbm, cls: 'mo-tip-b' },
    { t: 'Saldo efetivo: ' + fmt('signed', d.saldo_efetivo) },
    { t: 'Saldo considerado: ' + fmt('signed', d.saldo_considerado) },
    { t: 'Saldo pelo índice de carga: ' + fmt('signed', d.saldo_carga) },
  ], onPick);
}

export function drawCarga(el: HTMLElement, { all, rs: base, sel, onPick }: Ctx) {
  const rs = base.filter((r) => r.carga_atual != null).sort((a, b) => (b.carga_atual as number) - (a.carga_atual as number));
  const ralvo = all.find((r) => r.ralvo != null)?.ralvo ?? null;
  const W = Math.max(260, el.clientWidth), rowH = 24, top = 24, bottom = 24;
  const H = top + rs.length * rowH + bottom;
  el.style.minHeight = H + 'px';
  const svg = makeSvg(el, W, H, 'Carga operacional por militar em cada GBM');
  const nameW = Math.min(W * 0.45, measure(svg, rs.map((r) => r.gbm), 'mo-t'));
  const x0 = nameW + 16;
  const max = d3.max(all, (d) => Math.max(d.carga_atual ?? 0, d.carga_atualizada ?? 0, ralvo ?? 0)) || 1;
  const x = d3.scaleLinear([0, max], [x0, W - 16]).nice();
  const ticks = x.ticks(Math.max(2, Math.floor((W - x0) / 72)));
  const axis = svg.append('g');
  axis.selectAll('line').data(ticks).join('line').attr('class', 'mo-gl')
    .attr('x1', (t) => x(t)).attr('x2', (t) => x(t)).attr('y1', top - 6).attr('y2', H - bottom + 4);
  axis.selectAll('text').data(ticks).join('text').attr('class', 'mo-t-muted')
    .attr('x', (t) => x(t)).attr('y', 10).attr('dy', '0.35em')
    .attr('text-anchor', (t, i) => (i === ticks.length - 1 && x(t) > W - 24 ? 'end' : 'middle'))
    .text((t) => fmt('int', t));
  if (ralvo != null) {
    svg.append('line').attr('class', 'mo-ref').attr('x1', x(ralvo)).attr('x2', x(ralvo)).attr('y1', top - 6).attr('y2', H - bottom + 4);
    const lab = 'Ralvo ' + fmt('int', ralvo);
    const lw = measure(svg, [lab], 'mo-t-muted');
    const lx = Math.max(x0 + lw / 2, Math.min(W - lw / 2, x(ralvo)));
    svg.append('text').attr('class', 'mo-t-muted').attr('x', lx).attr('y', H - 8).attr('text-anchor', 'middle').text(lab);
  }
  const tip = tipFor(el);
  const g = svg.append('g').selectAll('g').data(rs).join('g')
    .attr('class', (d) => 'mo-row' + (d.gbm === sel ? ' is-sel' : ''))
    .attr('transform', (_d, i) => `translate(0,${top + i * rowH})`)
    .attr('aria-label', (d) => `${d.gbm}, carga ${fmt('dec2', d.carga_atual)}, atualizada ${fmt('dec2', d.carga_atualizada)}`);
  g.append('rect').attr('class', 'mo-hit').attr('width', W).attr('height', rowH).attr('rx', 4);
  g.append('text').attr('class', 'mo-t').attr('x', 2).attr('y', rowH / 2).attr('dy', '0.35em').text((d) => d.gbm);
  const comAt = g.filter((d) => d.carga_atualizada != null);
  comAt.append('line').attr('class', 'mo-link').attr('x1', (d) => x(d.carga_atual as number)).attr('x2', (d) => x(d.carga_atualizada as number)).attr('y1', rowH / 2).attr('y2', rowH / 2);
  comAt.append('circle').attr('class', 'mo-dot-2').attr('cx', (d) => x(d.carga_atualizada as number)).attr('cy', rowH / 2).attr('r', 4.5);
  g.append('circle').attr('class', 'mo-bar mo-dot-1').attr('cx', (d) => x(d.carga_atual as number)).attr('cy', rowH / 2).attr('r', 4.5);
  rowEvents(g, el, tip, (d: AbsRow) => [
    { t: 'COMAR ' + d.comar, cls: 'mo-tip-h' }, { t: d.gbm, cls: 'mo-tip-b' },
    { t: 'Com efetivo atual: ' + fmt('dec2', d.carga_atual), sw: '--accent' },
    { t: 'Atualizada: ' + fmt('dec2', d.carga_atualizada), sw: '--accent-2' },
    { t: 'Coeficiente de ajuste: ' + fmt('dec2', d.coef_ajuste) },
  ], onPick);
}

export function drawBullet(el: HTMLElement, all: AbsRow[], r: AbsRow | null) {
  if (!r) { el.replaceChildren(); return; }
  const W = Math.max(220, el.clientWidth), H = 68;
  const svg = makeSvg(el, W, H, 'Efetivo atual, necessário e novo necessário de ' + r.gbm);
  const max = d3.max(all, (d) => Math.max(d.efetivo_atual ?? 0, d.efetivo_necessario ?? 0, d.novo_efetivo ?? 0)) || 1;
  const x = d3.scaleLinear([0, max], [1, W - 1]);
  const yb = 26, bh = 16;
  svg.append('rect').attr('class', 'mo-track').attr('x', 1).attr('y', yb).attr('width', W - 2).attr('height', bh).attr('rx', 3);
  if (r.efetivo_atual != null) svg.append('rect').attr('class', 'mo-bar-acc').attr('x', 1).attr('y', yb).attr('width', Math.max(0, x(r.efetivo_atual) - 1)).attr('height', bh).attr('rx', 3);
  const label = (txt: string, xv: number, y: number) => {
    const w = measure(svg, [txt], 'mo-t-muted');
    svg.append('text').attr('class', 'mo-t-muted').attr('x', Math.max(1, Math.min(W - w - 1, xv - w / 2))).attr('y', y).text(txt);
  };
  if (r.efetivo_necessario != null) {
    svg.append('line').attr('class', 'mo-tick-nec').attr('x1', x(r.efetivo_necessario)).attr('x2', x(r.efetivo_necessario)).attr('y1', yb - 6).attr('y2', yb + bh + 2);
    label('Necessário ' + fmt('int', r.efetivo_necessario), x(r.efetivo_necessario), 14);
  }
  if (r.novo_efetivo != null) {
    svg.append('line').attr('class', 'mo-ref').attr('x1', x(r.novo_efetivo)).attr('x2', x(r.novo_efetivo)).attr('y1', yb - 2).attr('y2', yb + bh + 8);
    label('Pela carga ' + fmt('int', r.novo_efetivo), x(r.novo_efetivo), H - 4);
  }
}
