import * as d3 from 'd3';
import type { Params, RiscoRow } from '@shared/types';
import type { ReactNode } from 'react';
import { Card, CardHead, Legend, PageErr, Tip } from '../components/bits';
import { D3Chart } from '../components/D3Chart';
import { makeSvg, measure, tipFor } from '../charts/base';
import { f1, f2, fInt } from '../format';
import { useData } from '../data';
import { useUi } from '../ui';

type CritK = 'dop' | 'iso' | 'pdo' | 'fd';
const CRIT: { k: CritK; p: keyof RiscoRow; nome: string; cor: string }[] = [
  { k: 'dop', p: 'p_dop', nome: 'Demanda operacional', cor: '--k1' },
  { k: 'iso', p: 'p_iso', nome: 'Isolamento geográfico', cor: '--k2' },
  { k: 'pdo', p: 'p_pdo', nome: 'Potencial de demanda', cor: '--k3' },
  { k: 'fd', p: 'fd', nome: 'Riscos estruturais', cor: '--k4' },
];
type Pesos = Record<CritK, number | null | undefined>;
const nz = (v: number | null | undefined, f: (x: number) => string) => (v == null ? '—' : f(v));
const fw = (x: number | null | undefined) => (x == null ? '—' : Number.isInteger(x) ? fInt(x) : f1(x));
const pt = (r: RiscoRow, k: keyof RiscoRow) => r[k] as number | null;

function pesosDe(par: Params | null, rows: RiscoRow[]): Pesos {
  const w = par?.pesos ?? {};
  if ([w.dop, w.iso, w.pdo, w.fd].every((x) => x != null)) return w as Pesos;
  const r = rows.find((o) => o.p_dop);
  const dop = r ? Math.round((((r.total ?? 0) - (r.p_iso ?? 0) - (r.p_pdo ?? 0) - (r.fd ?? 0)) / (r.p_dop as number)) * 10) / 10 : 2;
  return { dop, iso: 1, pdo: 1, fd: 1 };
}

function drawRk(el: HTMLElement, all: RiscoRow[], rs: RiscoRow[], sel: RiscoRow | null, w: Pesos, onPick: (g: string) => void) {
  const W = Math.max(260, el.clientWidth), rowH = 24, barH = 14, padT = 2;
  const H = rs.length * rowH + padT * 2;
  el.style.minHeight = H + 'px';
  const svg = makeSvg(el, W, H, 'Composição da pontuação da matriz de risco por GBM');
  const nameW = Math.min(W * 0.45, measure(svg, rs.map((r) => r.gbm), 'mo-t'));
  const valW = measure(svg, rs.map((r) => f2(r.total as number)), 'mo-t-muted') + 8;
  const x0 = nameW + 12;
  const soma = (w.dop ?? 0) + (w.iso ?? 0) + (w.pdo ?? 0) + (w.fd ?? 0);
  const x = d3.scaleLinear([0, Math.max(soma * 6, d3.max(all, (d) => d.total ?? 0) || 1)], [x0, W - valW]);
  const tip = tipFor(el);
  const g = svg.append('g').selectAll('g').data(rs).join('g')
    .attr('class', (d) => 'mo-row' + (sel && d.gbm === sel.gbm ? ' is-sel' : ''))
    .attr('transform', (_d, i) => `translate(0,${padT + i * rowH})`)
    .attr('tabindex', 0).attr('role', 'button')
    .attr('aria-label', (d) => `${d.gbm}, pontuação ${f2(d.total as number)}`);
  g.append('rect').attr('class', 'mo-hit').attr('width', W).attr('height', rowH).attr('rx', 4);
  g.append('text').attr('class', 'mo-t').attr('x', 2).attr('y', rowH / 2).attr('dy', '0.35em').text((d) => d.gbm);
  g.each(function (d) {
    let acc = 0;
    const gg = d3.select(this);
    CRIT.forEach((c) => {
      const v = (pt(d, c.p) ?? 0) * (w[c.k] ?? 1);
      gg.append('rect').attr('x', x(acc)).attr('y', (rowH - barH) / 2).attr('height', barH).attr('width', Math.max(0, x(acc + v) - x(acc) - 1)).style('fill', `var(${c.cor})`);
      acc += v;
    });
    gg.append('text').attr('class', 'mo-t-muted').attr('x', x(acc) + 6).attr('y', rowH / 2).attr('dy', '0.35em').text(f2(d.total as number));
  });
  g.on('click', (_ev, d) => onPick(d.gbm))
    .on('keydown', (ev: KeyboardEvent, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onPick(d.gbm); } })
    .on('mousemove', (ev: MouseEvent, d) => {
      const [px, py] = d3.pointer(ev, el);
      tip.show([
        { t: 'COMAR ' + d.comar, cls: 'mo-tip-h' }, { t: d.gbm, cls: 'mo-tip-b' },
        ...CRIT.map((c) => { const v = pt(d, c.p) ?? 0; return { t: `${c.nome}: ${Number.isInteger(v) ? fInt(v) : f2(v)} pts` + (w[c.k] != null && w[c.k] !== 1 ? ` × ${fInt(w[c.k] as number)}` : ''), sw: c.cor }; }),
        { t: 'Total: ' + f2(d.total as number) },
      ], px, py);
    })
    .on('mouseleave blur', () => tip.hide());
}

const Step = ({ cor, titulo, calc, children }: { cor: string; titulo: string; calc: string; children: ReactNode }) => (
  <li style={{ ['--c' as string]: `var(${cor})` }}><span className="rk-st-t">{titulo}</span><span className="rk-st-c">{calc}</span><span className="rk-st-r">{children}</span></li>
);

export function Risco() {
  const { risco, params } = useData();
  const ui = useUi();
  const par = params?.data ?? null;
  const all = risco?.data ?? [];
  const w = pesosDe(par, all);
  const soma = (w.dop ?? 0) + (w.iso ?? 0) + (w.pdo ?? 0) + (w.fd ?? 0);
  const rs = all.filter((r) => ui.comar === 'Todos' || r.comar === ui.comar).slice().sort((a, b) => (b.total as number) - (a.total as number) || a.gbm.localeCompare(b.gbm, 'pt-BR'));
  const sel = rs.find((r) => r.gbm === ui.gbm) || rs[0] || null;
  const beta = par?.beta && par.beta.length === 3 ? par.beta : null;
  const fdP = par?.fdPesos && par.fdPesos.length === 3 ? par.fdPesos : null;
  const classe = (k: CritK, p: number | null) => {
    const c = par?.classes?.find((o) => o.p === p);
    return !c ? '' : k === 'dop' ? c.cDop : k === 'iso' ? c.cIso : k === 'pdo' ? c.cPdo : '';
  };
  const heat = (p: number | null, cor: string) => (p == null ? undefined : `color-mix(in srgb, var(${cor}) ${Math.round(6 + 9 * p)}%, var(--panel))`);
  const pesoTxt = (k: CritK, p: number | null): ReactNode => {
    const c = classe(k, p);
    const base = <><b>{fInt(p ?? 0)} pontos</b>{c ? ` (${c.toLowerCase()})` : ''}</>;
    return w[k] != null && w[k] !== 1 ? <>{base} × peso {fw(w[k])} = <b>{fw((p ?? 0) * (w[k] as number))}</b></> : base;
  };

  const tabelaClasses = (k: CritK) => {
    if (k === 'fd') {
      const lim = par?.fdLim;
      if (!lim) return null;
      const pe = sel?.p_ext ?? null, pb = sel?.p_edif ?? null, nv = sel?.risco ?? null;
      const rn = par?.riscoNivel;
      return (
        <tbody>
          <tr><th>Pontos</th><th className="n">Extensão (ha) a partir de</th><th className="n">Edificações a partir de</th></tr>
          {lim.map((c) => (
            <tr key={c.p}><td className={c.p === pe || c.p === pb ? 'is-on' : ''}>{fInt(c.p as number)}</td>
              <td className={'n' + (c.p === pe ? ' is-on' : '')}>{fInt(Math.round(c.ext as number))}</td>
              <td className={'n' + (c.p === pb ? ' is-on' : '')}>{fInt(Math.round(c.edif as number))}</td></tr>
          ))}
          {rn && rn.length > 0 && (
            <>
              <tr className="rk-cls-sub"><th>Risco da área</th><th className="n">Nível</th><th className="n">Pontos</th></tr>
              {rn.map((c) => (
                <tr key={c.n} className={c.n === nv ? 'is-on' : undefined}><td /><td className="n">{fInt(c.n as number)}</td><td className="n">{Number.isInteger(c.p) ? fInt(c.p as number) : f2(c.p as number)}</td></tr>
              ))}
            </>
          )}
        </tbody>
      );
    }
    const cls = par?.classes;
    if (!cls) return null;
    const lim = (c: NonNullable<Params['classes']>[number]) => (k === 'dop' ? f2(c.dop as number) : k === 'iso' ? `${fInt(Math.round(c.iso as number))} s` : f2(c.pdo as number));
    const pts = sel ? (sel[('p_' + k) as keyof RiscoRow] as number | null) : null;
    return (
      <tbody>
        <tr><th>Pontos</th><th className="n">A partir de</th><th>Classe</th></tr>
        {cls.map((c) => <tr key={c.p} className={c.p === pts ? 'is-on' : undefined}><td>{fInt(c.p as number)}</td><td className="n">{lim(c)}</td><td>{classe(k, c.p)}</td></tr>)}
      </tbody>
    );
  };

  const b = beta ? beta.map((o) => o.b as number) : null;
  const fdp = fdP ? fdP.map((o) => o.w as number) : null;
  const sumfd = fdp ? fdp.reduce((a, x) => a + x, 0) : null;
  const calcDop = beta
    ? `Coeficiente = ocorrências com ${beta[0].faixa} atendimentos × ${f1(beta[0].b as number)} + com ${beta[1].faixa} × ${f1(beta[1].b as number)} + com ${beta[2].faixa} × ${f1(beta[2].b as number)}.`
    : 'Coeficiente = soma das ocorrências ponderadas pela complexidade.';
  const calcFd = fdP
    ? `Fator D = (extensão × ${fw(fdP[0].w)} + edificações × ${fw(fdP[1].w)} + risco da área × ${fw(fdP[2].w)}) ÷ ${fw(fdP.reduce((a, o) => a + (o.w ?? 0), 0))}.`
    : 'Fator D = média ponderada dos três subcritérios.';
  const pesoCard = (k: CritK) => `peso ${fw(w[k])}`;

  return (
    <div className="mo-page">
      {risco?.status === 'error' && <PageErr titulo="Não foi possível ler a aba Matriz de Risco." msg={risco.msg} />}
      <p className="mo-lede">A matriz de risco ordena os GBMs por prioridade. Cada critério vale de 1 a 6 pontos. A demanda operacional tem peso <b>{fw(w.dop)}</b>. O total vai de <b>{fw(soma)}</b> a <b>{fw(soma * 6)}</b> pontos. Mais pontos = mais prioridade.</p>
      <div className="rk-eq" aria-label="Fórmula da pontuação total">
        <span className="rk-res">Pontuação</span><span className="rk-op">=</span>
        <span className="rk-tok" style={{ ['--c' as string]: 'var(--k1)' }}><b>{fw(w.dop)}</b> × Demanda operacional</span><span className="rk-op">+</span>
        <span className="rk-tok" style={{ ['--c' as string]: 'var(--k2)' }}><b>{fw(w.iso)}</b> × Isolamento geográfico</span><span className="rk-op">+</span>
        <span className="rk-tok" style={{ ['--c' as string]: 'var(--k3)' }}><b>{fw(w.pdo)}</b> × Potencial de demanda</span><span className="rk-op">+</span>
        <span className="rk-tok" style={{ ['--c' as string]: 'var(--k4)' }}><b>{fw(w.fd)}</b> × Riscos estruturais</span>
      </div>

      <div className="mo-row2">
        <Card id="rk-composicao">
          <CardHead title="Pontos por GBM" tip={`Fonte: aba Matriz de Risco, coluna «Pontuação total (ponderada)».
Pesos: aba Parâmetros.`} note="Cada cor é um critério, já com o peso. Selecione um GBM para ver o cálculo." />
          {risco?.status === 'ok' && <D3Chart id="ch-rk" draw={(el) => drawRk(el, all, rs, sel, w, (g) => ui.pick(g, 'rk-exemplo'))} deps={[all, ui.comar, sel?.gbm, par]} />}
          <Legend>
            {CRIT.map((c) => <span className="mo-key" key={c.k}><i className="mo-nd" style={{ ['--c' as string]: `var(${c.cor})` }} />{c.nome}</span>)}
          </Legend>
        </Card>
        <Card id="rk-exemplo">
          <div className="mo-card-head">
            <p className="mo-eyebrow">Cálculo <Tip>{`Valores da aba Matriz de Risco, linha do GBM.
Pesos, β e classes: aba Parâmetros.`}</Tip></p>
            <h2 className="mo-ficha-nome">{sel?.gbm ?? '—'}</h2>
            <p className="mo-sub">{sel ? `COMAR ${sel.comar} · total: ${f2(sel.total as number)} pontos` : ''}</p>
          </div>
          {sel && (
            <>
              <ol className="rk-steps">
                <Step cor="--k1" titulo="a) Demanda operacional"
                  calc={b ? `${nz(sel.q2, fInt)} × ${f1(b[0])} + ${nz(sel.q3, fInt)} × ${f1(b[1])} + ${nz(sel.q4, fInt)} × ${f1(b[2])} = ${nz(sel.dop, f1)}` : `Coeficiente: ${nz(sel.dop, f1)}`}>{pesoTxt('dop', sel.p_dop)}</Step>
                <Step cor="--k2" titulo="b) Isolamento geográfico"
                  calc={`Apoio do ${sel.apoio || '—'}, a ${nz(sel.dist, f1)} km: ${nz(sel.tmin, fInt)} min ${nz(sel.tseg, fInt)} s = ${nz(sel.tapoio, fInt)} s`}>{pesoTxt('iso', sel.p_iso)}</Step>
                <Step cor="--k3" titulo="c) Potencial de demanda"
                  calc={`${nz(sel.pop, fInt)} habitantes ÷ R$ ${nz(sel.renda, fInt)} = ${nz(sel.pdo, f2)}`}>{pesoTxt('pdo', sel.p_pdo)}</Step>
                <Step cor="--k4" titulo="d) Riscos estruturais"
                  calc={`Extensão ${nz(sel.ext, fInt)} ha → ${nz(sel.p_ext, fInt)}; edificações acima de 12 m: ${nz(sel.edif, fInt)} → ${nz(sel.p_edif, fInt)}; risco da área ${nz(sel.risco, fInt)} → ${nz(sel.p_risco, fInt)}` +
                    (fdp ? `. (${nz(sel.p_ext, fInt)} × ${fw(fdp[0])} + ${nz(sel.p_edif, fInt)} × ${fw(fdp[1])} + ${nz(sel.p_risco, fInt)} × ${fw(fdp[2])}) ÷ ${fw(sumfd)}` : '')}>
                  <b>{f2(sel.fd as number)} pontos</b>{w.fd != null && w.fd !== 1 && <> × peso {fw(w.fd)} = <b>{f2((sel.fd as number) * (w.fd as number))}</b></>}
                </Step>
              </ol>
              <div className="rk-total">
                <b>{f2(sel.total as number)}</b>
                <span>{CRIT.map((c) => f2((pt(sel, c.p) ?? 0) * (w[c.k] ?? 1))).join(' + ')} = total. Posição: {nz(sel.pos, fInt)}º de {fInt(all.length)}.</span>
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="rk-grid">
        {([
          ['dop', 'a) Demanda operacional', 'Ocorrências de 2025, com peso pela complexidade. Complexidade = número de atendimentos por ocorrência.', calcDop,
            `Fonte: aba Matriz de Risco, colunas «≤2 atend.», «3 atend.», «4+ atend.» e «Coeficiente DOP».
β e classes: aba Parâmetros.`],
          ['iso', 'b) Isolamento geográfico', 'Tempo de chegada do apoio do GBM mais próximo. Apoio mais distante = mais pontos.', 'Tempo de apoio (s) = minutos × 60 + segundos.',
            `Fonte: aba Matriz de Risco, colunas «GBM de apoio», «Distância (km)» e «Tempo de apoio (s)».
Classes: aba Parâmetros.`],
          ['pdo', 'c) Potencial de demanda', 'População atendida ÷ renda per capita. Mais população e menor renda = mais pontos.', 'Coeficiente PDO = população atendida ÷ renda per capita (R$).',
            `Fonte: aba Matriz de Risco, colunas «População atendida», «Renda per capita (R$)» e «Coeficiente PDO».
Classes: aba Parâmetros.`],
          ['fd', 'd) Riscos estruturais', 'Média de 3 subcritérios: extensão da área, edificações acima de 12 m e risco da área.', calcFd,
            `Fonte: aba Matriz de Risco, colunas «Extensão da área (ha)», «Edificações elevadas (> 12 m)» e «Risco da área (1 a 5)».
Limites e pesos: aba Parâmetros.`],
        ] as [CritK, string, string, string, string][]).map(([k, titulo, nota, calc, tip], i) => (
          <Card key={k} style={{ ['--c' as string]: `var(${CRIT[i].cor})` }}>
            <div className="rk-card-h"><i className="mo-nd" style={{ ['--c' as string]: `var(${CRIT[i].cor})` }} /><h2>{titulo} <Tip>{tip}</Tip></h2><span className="rk-peso">{pesoCard(k)}</span></div>
            <p className="mo-note">{nota}</p>
            <p className="rk-calc">{calc}</p>
            <table className="rk-cls">{tabelaClasses(k)}</table>
          </Card>
        ))}
      </div>

      <Card id="rk-tabela">
        <CardHead title="Valores e pontos" tip="Fonte: aba Matriz de Risco." note="Valor medido e pontos de cada critério. Cor mais forte = mais pontos." />
        <div className="mo-table-wrap">
          <table className="mo-table mo-tr">
            <thead>
              <tr className="mo-cols">
                <th className="l">GBM</th><th className="l">COMAR</th>
                <th className="n gs">Demanda (coef.)</th><th>Pts</th>
                <th className="n gs">Apoio (s)</th><th>Pts</th>
                <th className="n gs">PDO</th><th>Pts</th>
                <th className="n gs">Riscos (fator D)</th>
                <th className="n gs">Total</th><th className="n">Posição</th>
              </tr>
            </thead>
            <tbody>
              {rs.map((r) => (
                <tr key={r.gbm} className={sel && r.gbm === sel.gbm ? 'is-sel' : undefined} onClick={() => ui.pick(r.gbm, 'rk-exemplo')}>
                  <td className="l">{r.gbm}</td><td className="l">{r.comar}</td>
                  <td className="n gs">{nz(r.dop, f1)}</td><td className="pt" style={{ background: heat(r.p_dop, '--k1') }}>{nz(r.p_dop, fInt)}</td>
                  <td className="n gs">{nz(r.tapoio, fInt)}</td><td className="pt" style={{ background: heat(r.p_iso, '--k2') }}>{nz(r.p_iso, fInt)}</td>
                  <td className="n gs">{nz(r.pdo, f2)}</td><td className="pt" style={{ background: heat(r.p_pdo, '--k3') }}>{nz(r.p_pdo, fInt)}</td>
                  <td className="pt gs" style={{ background: heat(r.fd, '--k4') }}>{nz(r.fd, f2)}</td>
                  <td className="n gs">{f2(r.total as number)}</td><td className="n">{r.pos != null ? fInt(r.pos) + 'º' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mo-note">{par?.fonte ?? ''}</p>
      </Card>
    </div>
  );
}
