import * as d3 from 'd3';
import type { AbsRow } from '@shared/types';
import { Card, CardHead, Legend } from '../components/bits';
import { D3Chart } from '../components/D3Chart';
import { makeSvg, measure, rowEvents, tipFor } from '../charts/base';
import { f2, fmt, NATS, natOf, type Nat } from '../format';
import { gbmSel, linhas } from '../derived';
import { useData } from '../data';
import { useUi } from '../ui';

const FAIXAS: [number, number][] = [[1, 8], [9, 16], [17, 24]];
const val = (r: AbsRow, k: string) => (r as unknown as Record<string, number | null>)[k];
const relacionadas = (r: AbsRow, nat: Nat) =>
  (['ur', 'ur_gsv', 'vme', 'vme2', 'vci', 'vs', 'vpa', 've', 'apoio'] as const).filter((c) => r[c] && nat.viat(c, r[c]));

function drawNatDots(el: HTMLElement, all: AbsRow[], rs: AbsRow[], nat: Nat, sel: string | null, onPick: (g: string) => void) {
  const W = Math.max(260, el.clientWidth), rowH = 24, top = 24, bottom = 6;
  const H = top + rs.length * rowH + bottom;
  el.style.minHeight = H + 'px';
  const svg = makeSvg(el, W, H, 'Posição de cada GBM por natureza de ocorrência');
  const posW = measure(svg, rs.map((r) => fmt('ord', val(r, nat.k))), 'mo-t-muted') + 8;
  const nameW = Math.min(W * 0.42, measure(svg, rs.map((r) => r.gbm), 'mo-t'));
  const x0 = posW + nameW + 16;
  const maxRk = d3.max(all, (d) => d3.max(NATS, (n) => val(d, n.k) ?? 0)) || 24;
  const x = d3.scaleLinear([1, maxRk], [x0 + 8, W - 10]);
  const ticks = [1, 6, 12, 18, 24].filter((t) => t <= maxRk);
  const axis = svg.append('g');
  axis.selectAll('line').data(ticks).join('line').attr('class', 'mo-gl').attr('x1', (t) => x(t)).attr('x2', (t) => x(t)).attr('y1', top - 6).attr('y2', H - bottom);
  axis.selectAll('text').data(ticks).join('text').attr('class', 'mo-t-muted').attr('x', (t) => x(t)).attr('y', 10).attr('dy', '0.35em').attr('text-anchor', 'middle').text((t) => fmt('ord', t));
  const tip = tipFor(el);
  const g = svg.append('g').selectAll('g').data(rs).join('g')
    .attr('class', (d) => 'mo-row' + (d.gbm === sel ? ' is-sel' : ''))
    .attr('transform', (_d, i) => `translate(0,${top + i * rowH})`)
    .attr('aria-label', (d) => `${d.gbm}: ` + NATS.map((n) => `${n.curto} ${fmt('ord', val(d, n.k))}`).join(', '));
  g.append('rect').attr('class', 'mo-hit').attr('width', W).attr('height', rowH).attr('rx', 4);
  g.append('text').attr('class', 'mo-t-muted').attr('x', 2).attr('y', rowH / 2).attr('dy', '0.35em').text((d) => fmt('ord', val(d, nat.k)));
  g.append('text').attr('class', 'mo-t').attr('x', posW).attr('y', rowH / 2).attr('dy', '0.35em').text((d) => d.gbm);
  const ext = (d: AbsRow) => (d3.extent(NATS, (n) => val(d, n.k)) as (number | undefined)[]).filter((v): v is number => v != null);
  g.append('line').attr('class', 'mo-link').attr('y1', rowH / 2).attr('y2', rowH / 2)
    .attr('x1', (d) => x(ext(d)[0] ?? 1)).attr('x2', (d) => x(ext(d)[1] ?? 1));
  NATS.filter((n) => n.k !== nat.k).forEach((n) => {
    g.filter((d) => val(d, n.k) != null).append('circle').attr('cx', (d) => x(val(d, n.k) as number)).attr('cy', rowH / 2).attr('r', 3.5).style('fill', `var(${n.cor})`).style('opacity', 0.8);
  });
  g.append('circle').attr('class', 'mo-bar').attr('cx', (d) => x(val(d, nat.k) as number)).attr('cy', rowH / 2).attr('r', 6).style('fill', `var(${nat.cor})`).style('stroke', 'var(--panel)').style('stroke-width', 1.5);
  rowEvents(g, el, tip, (d: AbsRow) => [
    { t: 'COMAR ' + d.comar, cls: 'mo-tip-h' }, { t: d.gbm, cls: 'mo-tip-b' },
    ...NATS.map((n) => ({ t: `${n.curto}: ${fmt('ord', val(d, n.k)) || '—'}`, sw: n.cor })),
    { t: 'Ocorrências (total): ' + (fmt('ord', d.rk_ocorrencias) || '—') },
  ], onPick);
}

export function Natureza() {
  const { matriz } = useData();
  const ui = useUi();
  const all = matriz?.data?.rows ?? [];
  const nat = natOf(ui.nat);
  const todas = linhas(all, ui.comar);
  const rs = todas.filter((r) => val(r, nat.k) != null).sort((a, b) => (val(a, nat.k) as number) - (val(b, nat.k) as number) || a.gbm.localeCompare(b.gbm, 'pt-BR'));
  const sel = gbmSel(all, ui.comar, ui.gbm);
  const top = rs.slice(0, 3).map((r) => `${r.gbm} (${fmt('ord', val(r, nat.k))})`);
  const topTxt = !top.length ? '—' : top.length > 1 ? top.slice(0, -1).join(', ') + ' e ' + top[top.length - 1] : top[0];
  const faixas = FAIXAS.map(([a, b]) => {
    const g = rs.filter((r) => (val(r, nat.k) as number) >= a && (val(r, nat.k) as number) <= b);
    const qtd = g.reduce((s, r) => s + relacionadas(r, nat).length, 0);
    return { gbms: g.length, qtd, media: g.length ? qtd / g.length : null };
  });
  const maxMedia = Math.max(1, ...faixas.map((f) => f.media ?? 0));
  const maxRk = d3.max(all, (d) => d3.max([...NATS.map((n) => val(d, n.k) ?? 0), d.rk_ocorrencias ?? 0])) || 24;
  const heat = (v: number | null, cor: string) => (v == null ? undefined : `color-mix(in srgb, var(${cor}) ${Math.round(8 + 42 * (maxRk - v) / Math.max(1, maxRk - 1))}%, var(--panel))`);

  return (
    <div className="mo-page">
      <p className="mo-lede">
        {ui.comar === 'Todos' ? <span className="mo-rec">Matriz completa:</span> : <span className="mo-rec">COMAR {ui.comar}:</span>}{' '}
        em <b>{nat.nome}</b>, os primeiros são <b>{topTxt}</b>.{' '}
        Esta natureza orienta a distribuição de <b>{nat.alvo}</b>. <b>{fmt('int', todas.filter((r) => relacionadas(r, nat).length > 0).length)}</b> de <b>{fmt('int', todas.length)}</b> GBMs têm ao menos uma.
      </p>

      <div className="mo-tabs" role="group" aria-label="Natureza da ocorrência">
        {NATS.map((n) => (
          <button key={n.k} type="button" aria-pressed={n.k === ui.nat} onClick={() => ui.setNat(n.k)}>
            <i className="mo-nd" style={{ ['--c' as string]: `var(${n.cor})` }} />{n.k === 'rk_ur' ? 'Unidade de resgate (UR)' : n.k === 'rk_multiemprego_florestal' ? 'Multiemprego com florestal' : n.curto}
          </button>
        ))}
      </div>

      <div className="mo-row2">
        <Card id="nat-posicoes">
          <CardHead title="Posição por natureza" tip={`Posição entre os 24 GBMs pelas ocorrências dos últimos 12 meses.
Fonte: aba Absoluto, colunas «Ranking…».
Origem: aba Parâmetros, dados GESINT.`} note="1º = mais ocorrências. Ponto grande = natureza escolhida. Linha = da melhor à pior posição do GBM." />
          <D3Chart id="ch-nat" draw={(el) => drawNatDots(el, all, rs, nat, sel, (g) => ui.pick(g))} deps={[all, ui.comar, ui.nat, sel]} />
          <Legend>
            {NATS.map((n) => <span className="mo-key" key={n.k}><i className="mo-nd" style={{ ['--c' as string]: `var(${n.cor})` }} />{n.k === 'rk_multiemprego_florestal' ? 'Multiemprego com florestal' : n.curto}</span>)}
          </Legend>
        </Card>

        <div className="mo-page" style={{ gap: 12 }}>
          <Card id="nat-criterio">
            <CardHead title="Natureza e viatura" tip={`Regra do Comando Operacional.
A contagem usa as viaturas com guarnição da aba Absoluto.
O AR de apoio, sem efetivo, fica fora.`} note="Cada ranking orienta um tipo de viatura." />
            <dl className="mo-crit">
              <div><dt><i className="mo-nd" style={{ ['--c' as string]: 'var(--n1)' }} />Unidade de resgate (UR)</dt><dd>Atendimento pré-hospitalar. Orienta a <b>UR</b> e a UR de reforço (GSV).</dd></div>
              <div><dt><i className="mo-nd" style={{ ['--c' as string]: 'var(--n2)' }} />Multiemprego</dt><dd>Ocorrências sem atendimento pré-hospitalar. Orienta <b>ABSL ou AR</b>.</dd></div>
              <div><dt><i className="mo-nd" style={{ ['--c' as string]: 'var(--n3)' }} />Multiemprego com florestal</dt><dd>Multiemprego mais ocorrências florestais. Orienta <b>ABSL ou AR</b>.</dd></div>
              <div><dt><i className="mo-nd" style={{ ['--c' as string]: 'var(--n4)' }} />Incêndio estrutural</dt><dd>Orienta as viaturas com água: <b>ASE ou ABT</b>.</dd></div>
            </dl>
          </Card>
          <Card id="nat-faixas">
            <CardHead title="Viaturas por faixa" tip={`Média das viaturas da natureza por GBM, em cada terço do ranking.
Fonte: aba Absoluto (rankings e viaturas).`} note="Se a frota segue o ranking, a 1ª faixa tem a maior média." />
            <div className="mo-bands">
              {FAIXAS.map(([a, b], i) => {
                const f = faixas[i];
                return (
                  <div className="mo-band" key={a} style={{ ['--c' as string]: `var(${nat.cor})` }}>
                    <span className="mo-band-k">{a}º a {b}º</span>
                    <span className="mo-band-bar"><i style={{ width: (f.media != null ? (100 * f.media) / maxMedia : 0) + '%' }} /></span>
                    <span className="mo-band-v"><b>{f.media == null ? '—' : f2(f.media).replace(/,00$/, '')}</b> por GBM · <span>{fmt('int', f.qtd)}</span> viaturas em <span>{fmt('int', f.gbms)}</span> GBMs</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <Card id="nat-tabela">
        <CardHead title="Ranking" tip={`Posição de cada GBM em cada natureza de ocorrência, nos últimos 12 meses. 1º = GBM com mais ocorrências.
Fonte: aba Absoluto, colunas de ranking.`} note="Ordem da natureza escolhida. Cor mais forte = posição mais alta." />
        <div className="mo-table-wrap">
          <table className="mo-table mo-tn">
            <thead>
              <tr className="mo-cols"><th>GBM</th><th>Posição</th><th>COMAR</th><th>Ocorrências (total)</th><th>UR</th><th>Multiemprego</th><th>Multiemprego c/ florestal</th><th>Incêndio estrutural</th></tr>
            </thead>
            <tbody>
              {rs.map((r) => (
                <tr key={r.gbm} className={r.gbm === sel ? 'is-sel' : undefined} onClick={() => ui.setGbm(r.gbm)}>
                  <td>{r.gbm}</td><td>{fmt('ord', val(r, nat.k))}</td><td>{r.comar}</td>
                  <td style={{ background: heat(r.rk_ocorrencias, '--ref') }}>{fmt('ord', r.rk_ocorrencias)}</td>
                  {NATS.map((n) => (
                    <td key={n.k} className={n.k === nat.k ? 'is-cur' : undefined} style={{ background: heat(val(r, n.k), n.cor) }}>{fmt('ord', val(r, n.k))}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
