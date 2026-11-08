import * as d3 from 'd3';
import type { CargaRow } from '@shared/types';
import { Fragment, type ReactNode } from 'react';
import { Card, CardHead, Legend, PageErr, Tip } from '../components/bits';
import { D3Chart } from '../components/D3Chart';
import { makeSvg, measure, tipFor } from '../charts/base';
import { f1, f2, fInt, fmt } from '../format';
import { useData } from '../data';
import { useUi } from '../ui';

const nz = (v: number | null | undefined, f: (x: number) => string) => (v == null ? '—' : f(v));
const corIndice = (ind: number | null) => {
  if (ind == null) return 'var(--accent)';
  const t = Math.max(0, Math.min(1, (ind - 1) / 4));
  return `color-mix(in srgb, var(--hot) ${Math.round(t * 100)}%, var(--cool))`;
};

function drawCg(el: HTMLElement, all: CargaRow[], rs: CargaRow[], sel: CargaRow | null, media: number | null, onPick: (g: string) => void) {
  const W = Math.max(260, el.clientWidth), rowH = 24, barH = 14, top = 6, bottom = 22;
  const H = top + rs.length * rowH + bottom;
  el.style.minHeight = H + 'px';
  const svg = makeSvg(el, W, H, 'Ocorrências por militar lotado em cada GBM');
  const nameW = Math.min(W * 0.45, measure(svg, rs.map((r) => r.gbm), 'mo-t'));
  const rot = (r: CargaRow) => `${f2(r.carga as number)} · ${nz(r.indice, f1)}`;
  const valW = measure(svg, rs.map(rot), 'mo-t-muted') + 8;
  const x0 = nameW + 12;
  const x = d3.scaleLinear([0, d3.max(all, (d) => d.carga ?? 0) || 1], [x0, W - valW]);
  if (media != null) {
    svg.append('line').attr('class', 'mo-ref').attr('x1', x(media)).attr('x2', x(media)).attr('y1', 0).attr('y2', H - bottom + 4);
    const lab = 'Média ' + f2(media);
    const lw = measure(svg, [lab], 'mo-t-muted');
    svg.append('text').attr('class', 'mo-t-muted').attr('x', Math.max(x0 + lw / 2, Math.min(W - lw / 2, x(media)))).attr('y', H - 6).attr('text-anchor', 'middle').text(lab);
  }
  const tip = tipFor(el);
  const g = svg.append('g').selectAll('g').data(rs).join('g')
    .attr('class', (d) => 'mo-row' + (sel && d.gbm === sel.gbm ? ' is-sel' : ''))
    .attr('transform', (_d, i) => `translate(0,${top + i * rowH})`)
    .attr('tabindex', 0).attr('role', 'button')
    .attr('aria-label', (d) => `${d.gbm}, ${f2(d.carga as number)} ocorrências por militar, índice ${nz(d.indice, f1)}`);
  g.append('rect').attr('class', 'mo-hit').attr('width', W).attr('height', rowH).attr('rx', 4);
  g.append('text').attr('class', 'mo-t').attr('x', 2).attr('y', rowH / 2).attr('dy', '0.35em').text((d) => d.gbm);
  g.append('rect').attr('class', 'mo-bar').attr('x', x0).attr('y', (rowH - barH) / 2).attr('height', barH).attr('rx', 3)
    .attr('width', (d) => Math.max(0, x(d.carga as number) - x0)).style('fill', (d) => corIndice(d.indice));
  g.append('text').attr('class', 'mo-t-muted').attr('x', (d) => x(d.carga as number) + 6).attr('y', rowH / 2).attr('dy', '0.35em').text(rot);
  g.on('click', (_ev, d) => onPick(d.gbm))
    .on('keydown', (ev: KeyboardEvent, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onPick(d.gbm); } })
    .on('mousemove', (ev: MouseEvent, d) => {
      const [px, py] = d3.pointer(ev, el);
      tip.show([
        { t: 'COMAR ' + d.comar, cls: 'mo-tip-h' }, { t: d.gbm, cls: 'mo-tip-b' },
        { t: `${nz(d.oc, fInt)} ocorrências ÷ ${nz(d.lot, fInt)} militares` },
        { t: `Carga: ${f2(d.carga as number)} por militar` },
        { t: `Índice relativo: ${nz(d.indice, f2)}` },
      ], px, py);
    })
    .on('mouseleave blur', () => tip.hide());
}

const Step = ({ cor, titulo, calc, children }: { cor: string; titulo: string; calc: string; children: ReactNode }) => (
  <li style={{ ['--c' as string]: `var(${cor})` }}><span className="rk-st-t">{titulo}</span><span className="rk-st-c">{calc}</span><span className="rk-st-r">{children}</span></li>
);

export function Carga() {
  const { carga, matriz, params } = useData();
  const ui = useUi();
  const ok = carga?.status === 'ok' && !!carga.data;
  const dados = carga?.data;
  const all = dados?.rows ?? [];
  const absAll = matriz?.data?.rows ?? [];
  const par = params?.data ?? null;
  const mx = all.reduce<CargaRow | null>((a, r) => (a == null || (r.carga as number) > (a.carga as number) ? r : a), null);
  const mn = all.reduce<CargaRow | null>((a, r) => (a == null || (r.carga as number) < (a.carga as number) ? r : a), null);
  const media = ok && dados!.total && dados!.total.carga != null ? dados!.total.carga : all.length ? d3.sum(all, (r) => r.oc ?? 0) / d3.sum(all, (r) => r.lot ?? 0) : null;
  const rs = all.filter((r) => ui.comar === 'Todos' || r.comar === ui.comar).slice().sort((a, b) => (b.carga as number) - (a.carga as number));
  const sel = rs.find((r) => r.gbm === ui.gbm) || rs[0] || null;
  const a = sel ? absAll.find((r) => r.gbm === sel.gbm) ?? null : null;
  const efTot = d3.sum(absAll, (r) => r.efetivo_atual ?? 0);
  const ocTot = d3.sum(all, (r) => r.oc ?? 0);
  const ralvo = efTot ? ocTot / efTot : null;
  const maxPm: Record<'aph' | 'multi' | 'inc', number> = {
    aph: d3.max(all, (r) => r.aph?.pm ?? 0) || 1, multi: d3.max(all, (r) => r.multi?.pm ?? 0) || 1, inc: d3.max(all, (r) => r.inc?.pm ?? 0) || 1,
  };

  const detalheCarga = () => {
    if (!sel || !a) return null;
    const of = a.oficial_dia && par?.ofBase != null ? par.ofBase * (1 + (par.ofPct ?? 0)) : 0;
    const cot = a.cotas_gsv && par?.cotaFator != null ? a.cotas_gsv * par.cotaFator : 0;
    const den = (a.efetivo_necessario ?? 0) + of + cot;
    const detalhe = [`${nz(a.efetivo_necessario, fInt)} do efetivo necessário`];
    if (of) detalhe.push(`${f1(of)} do oficial de dia (${fInt(par!.ofBase as number)} + ${fInt(Math.round((par!.ofPct ?? 0) * 100))}%)`);
    if (cot) detalhe.push(`${f1(cot)} de ${fInt(a.cotas_gsv as number)} cotas de GSV × ${f1(par!.cotaFator as number)}`);
    return `${nz(sel.oc, fInt)} ÷ (${detalhe.join(' + ')}) = ${nz(sel.oc, fInt)} ÷ ${f1(den)}`;
  };

  return (
    <div className="mo-page">
      {carga?.status === 'error' && <PageErr titulo="Não foi possível ler a aba Carga Operacional." msg={carga.msg} />}
      <p className="mo-lede">Carga = ocorrências ÷ militares lotados. A média dos 24 GBMs é <b>{nz(media, f2)}</b> por militar. Maior carga: <b>{mx ? mx.gbm : '—'}</b> (<b>{mx ? f2(mx.carga as number) : '—'}</b>). Menor carga: <b>{mn ? mn.gbm : '—'}</b> (<b>{mn ? f2(mn.carga as number) : '—'}</b>).</p>
      <div className="rk-eq" aria-label="Fórmulas da carga operacional">
        <span className="rk-tok" style={{ ['--c' as string]: 'var(--accent)' }}>Carga = ocorrências ÷ militares</span>
        <span className="rk-tok" style={{ ['--c' as string]: 'var(--hot)' }}>Índice = 1 + 4 × (carga − mínima) ÷ (máxima − mínima)</span>
        <span className="rk-tok" style={{ ['--c' as string]: 'var(--k1)' }}>Ralvo = ocorrências ÷ efetivo atual (todos os GBMs)</span>
      </div>

      <div className="mo-row2">
        <Card id="cg-grafico">
          <CardHead title="Carga por GBM" tip={`Fonte: aba Carga Operacional, colunas «Ocorrências / Militares lotados» e «Índice de Carga Operacional Relativa».
Militares: aba Parâmetros (BRADO).
Ocorrências: aba Parâmetros (GESINT).`} note="Cor = índice de carga, de 1 a 5. Linha tracejada = média. Selecione um GBM para ver o cálculo." />
          {ok && <D3Chart id="ch-cg" draw={(el) => drawCg(el, all, rs, sel, media, (g) => ui.pick(g, 'cg-exemplo'))} deps={[all, ui.comar, sel?.gbm]} />}
          <Legend>
            <span className="ta-scale">Índice: 1 <i className="ta-grad ta-grad-dem" /> 5</span>
            <span className="mo-key"><i className="mo-sw is-dash" />Média dos GBMs</span>
          </Legend>
        </Card>
        <Card id="cg-exemplo">
          <div className="mo-card-head">
            <p className="mo-eyebrow">Cálculo <Tip>{`Fonte: aba Carga Operacional e aba Absoluto, linha do GBM.
Ralvo: aba COMAR.
Constantes de GSV e oficial de dia: aba Parâmetros.`}</Tip></p>
            <h2 className="mo-ficha-nome">{sel?.gbm ?? '—'}</h2>
            <p className="mo-sub">{sel ? `COMAR ${sel.comar} · da carga ao saldo` : ''}</p>
          </div>
          {sel && (
            <ol className="rk-steps">
              <Step cor="--accent" titulo="1. Carga operacional" calc={`${nz(sel.oc, fInt)} ocorrências ÷ ${nz(sel.lot, fInt)} militares lotados`}><b>{f2(sel.carga as number)} ocorrências por militar</b></Step>
              <Step cor="--hot" titulo="2. Índice de carga relativa" calc={`1 + 4 × (${f2(sel.carga as number)} − ${mn ? f2(mn.carga as number) : '—'}) ÷ (${mx ? f2(mx.carga as number) : '—'} − ${mn ? f2(mn.carga as number) : '—'})`}><b>{nz(sel.indice, f2)}</b> numa escala de 1 a 5</Step>
              <Step cor="--k1" titulo="3. Relação alvo (Ralvo)" calc={`${fInt(ocTot)} ocorrências dos GBMs ÷ ${fInt(efTot)} militares do efetivo atual`}><b>{nz(ralvo, f1)} ocorrências por militar</b> (referência para todos os GBMs)</Step>
              {a && (
                <>
                  <Step cor="--k2" titulo="4. Coeficiente de ajuste" calc={`(${nz(sel.oc, fInt)} ÷ ${nz(a.efetivo_atual, fInt)} do efetivo atual) ÷ ${nz(ralvo, f1)}`}>
                    <b>{nz(a.coef_ajuste, f2)}</b>{(a.coef_ajuste ?? 1) > 1 ? ': carga acima da média' : (a.coef_ajuste ?? 1) < 1 ? ': carga abaixo da média' : ''}
                  </Step>
                  <Step cor="--k3" titulo="5. Novo efetivo necessário" calc={`${nz(sel.oc, fInt)} ÷ ${nz(ralvo, f1)} = ${ralvo && sel.oc != null ? f1(sel.oc / ralvo) : '—'}, com mínimo de 69`}><b>{nz(a.novo_efetivo, fInt)} militares</b></Step>
                  <Step cor="--k4" titulo="6. Saldo pelo índice de carga" calc={`${nz(a.efetivo_atual, fInt)} do efetivo atual − ${nz(a.novo_efetivo, fInt)} do novo efetivo necessário`}>
                    <b>{nz(a.saldo_carga, (v) => fmt('signed', v))}</b>{(a.saldo_carga ?? 0) < 0 ? ' (faltam militares)' : (a.saldo_carga ?? 0) > 0 ? ' (sobram militares)' : ''}
                  </Step>
                  <Step cor="--muted" titulo="7. Carga operacional atualizada" calc={detalheCarga() ?? ''}><b>{nz(a.carga_atualizada, f2)} por militar</b> com o efetivo previsto na matriz</Step>
                </>
              )}
            </ol>
          )}
        </Card>
      </div>

      <Card id="cg-natureza">
        <CardHead title="Carga por natureza" tip={`Fonte: aba Carga Operacional.
A aba não informa o critério de contagem por natureza.
A soma das naturezas passa do total de ocorrências.`} note="Ocorrências por natureza e por militar. Posição: 1º = maior carga." />
        <div className="mo-table-wrap">
          <table className="mo-table mo-tr">
            <thead>
              <tr className="mo-groups"><th colSpan={3} /><th colSpan={3} className="gs">APH (emergência médica e acidente de trânsito)</th><th colSpan={3} className="gs">Multiemprego (exceto emergência médica)</th><th colSpan={3} className="gs">Incêndio estrutural</th></tr>
              <tr className="mo-cols">
                <th className="l">GBM</th><th className="n">Militares lotados</th><th className="n">Ocorrências</th>
                {[0, 1, 2].map((i) => <Fragment key={i}><th className="n gs">Ocorrências</th><th className="n">Por militar</th><th className="n">Posição</th></Fragment>)}
              </tr>
            </thead>
            <tbody>
              {rs.map((r) => (
                <tr key={r.gbm} className={sel && r.gbm === sel.gbm ? 'is-sel' : undefined} onClick={() => ui.pick(r.gbm, 'cg-exemplo')}>
                  <td className="l">{r.gbm}</td><td className="n">{nz(r.lot, fInt)}</td><td className="n">{nz(r.oc, fInt)}</td>
                  {(['aph', 'multi', 'inc'] as const).map((k, i) => {
                    const v = r[k];
                    const cor = ['--n1', '--n2', '--n4'][i];
                    return (
                      <Fragment key={k}>
                        <td className="n gs">{nz(v?.oc, fInt)}</td>
                        <td className="n"><span className="cg-cell"><i className="cg-bar" style={{ width: v?.pm == null ? 0 : Math.round((48 * v.pm) / maxPm[k]) + 'px', ['--c' as string]: `var(${cor})` }} /><span>{nz(v?.pm, f2)}</span></span></td>
                        <td className="n">{v?.rkpm != null ? fInt(v.rkpm) + 'º' : '—'}</td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card id="cg-defs">
        <div className="mo-card-head"><h2>Termos</h2></div>
        <dl className="mo-defs">
          <div><dt>Carga atual</dt><dd>Ocorrências ÷ militares lotados no GBM.</dd></div>
          <div><dt>Índice de carga relativa</dt><dd>A carga em escala de 1 a 5. Menor carga = 1. Maior carga = 5.</dd></div>
          <div><dt>Relação alvo (Ralvo)</dt><dd>Ocorrências de todos os GBMs ÷ efetivo atual total. É a carga de referência.</dd></div>
          <div><dt>Coeficiente de ajuste</dt><dd>Carga do GBM ÷ Ralvo. Valor acima de 1 = carga acima da referência.</dd></div>
          <div><dt>Novo efetivo necessário</dt><dd>Ocorrências ÷ Ralvo. O mínimo é 69 militares.</dd></div>
          <div><dt>Carga atualizada</dt><dd>Ocorrências ÷ (efetivo necessário + oficial de dia + cotas de GSV). É a carga com o efetivo da matriz.</dd></div>
        </dl>
      </Card>
    </div>
  );
}
