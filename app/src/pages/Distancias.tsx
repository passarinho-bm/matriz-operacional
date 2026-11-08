import * as d3 from 'd3';
import type { AbsRow, MatrizDist, RiscoRow } from '@shared/types';
import { useMemo, useState } from 'react';
import { Card, CardHead, Legend, PageErr, Tabs } from '../components/bits';
import { D3Chart } from '../components/D3Chart';
import { makeSvg, measure } from '../charts/base';
import { fInt, fold, norm } from '../format';
import { useData } from '../data';
import { useUi } from '../ui';

type Medida = 'tempo' | 'dist';
const UN: Record<Medida, string> = { tempo: 'min', dist: 'km' };
const nz = (v: number | null | undefined, f: (x: number) => string) => (v == null ? '—' : f(v));
const canon = (n: string) => fold(norm(n)).replace(/\s*\/\s*/g, '/');
const curtoGbm = (n: string) => { const m = norm(n).match(/^(\d+º)/); return m ? m[1] : norm(n).split('/')[0]; };

interface Viz { d: string; nome: string; t: number | null; km: number | null }

export function Distancias() {
  const { params, matriz, risco } = useData();
  const ui = useUi();
  const par = params?.data ?? null;
  const absAll: AbsRow[] = matriz?.data?.rows ?? [];
  const riscoAll: RiscoRow[] = risco?.data ?? [];
  const T = par?.tempo ?? null, D = par?.dist ?? null;
  const ok = !!(T && D);
  const [m, setM] = useState<Medida>('tempo');
  const [origem, setOrigem] = useState<string | null>(null);
  const [raio, setRaio] = useState<Record<Medida, number>>({ tempo: 15, dist: 10 });
  const [cel, setCel] = useState<[string, string] | null>(null);
  const [hov, setHov] = useState<{ tab: Medida; c: number; o: string; d: string } | null>(null);

  const comarDe = (n: string) => {
    const c = canon(n);
    return absAll.find((r) => canon(r.gbm) === c)?.comar ?? riscoAll.find((o) => canon(o.gbm) === c)?.comar ?? '';
  };
  const mat = (k: Medida): MatrizDist | null => (k === 'tempo' ? T : D);
  const val = (k: Medida, o: string, d: string) => {
    const M = mat(k);
    if (!M) return null;
    const r = M.rows.find((x) => canon(x.nome) === o);
    const j = M.cols.findIndex((x) => canon(x) === d);
    return r && j >= 0 ? r.v[j] : null;
  };
  const ext = useMemo(() => {
    const e = (M: MatrizDist | null) => (M ? (d3.extent(M.rows.flatMap((r) => r.v).filter((x): x is number => x != null)) as [number, number]) : ([0, 0] as [number, number]));
    return { tempo: e(T), dist: e(D) };
  }, [T, D]);
  const cor = (k: Medida, v: number | null) => {
    if (v == null) return '';
    const [lo, hi] = ext[k];
    const t = hi === lo ? 0.5 : (v - lo) / (hi - lo);
    const d = t - 0.5, pct = Math.round(Math.abs(d) * 2 * 58);
    return pct < 5 ? '' : `color-mix(in srgb, var(${d > 0 ? '--hot' : '--cool'}) ${pct}%, var(--panel))`;
  };
  const cfg = m === 'tempo' ? { min: 5, max: 40 } : { min: 1, max: Math.max(10, Math.min(100, Math.ceil((ext.dist[1] || 50) / 5) * 5)) };
  const raioAtual = Math.max(cfg.min, Math.min(cfg.max, raio[m]));
  const noRaio = (v: Viz) => { const x = m === 'tempo' ? v.t : v.km; return x != null && x <= raioAtual; };

  const nomes = T ? T.rows.map((r) => r.nome) : [];
  const orig = origem && nomes.some((n) => canon(n) === origem) ? origem : (() => {
    const g = ui.gbm && nomes.find((n) => canon(n) === canon(ui.gbm as string));
    return nomes.length ? canon(g || nomes[0]) : null;
  })();
  const nomeDe = (c: string) => nomes.find((n) => canon(n) === c) || c;
  const vizinhos = (o: string): Viz[] => T
    ? T.cols.map(canon).filter((d) => d !== o).map((d) => ({ d, nome: T.cols.find((x) => canon(x) === d) as string, t: val('tempo', o, d), km: val('dist', o, d) }))
      .filter((x) => x.t != null).sort((a, b) => (a.t as number) - (b.t as number) || (a.km ?? 0) - (b.km ?? 0))
    : [];
  const prox = nomes.map((n) => ({ n, v: vizinhos(canon(n)) })).filter((x) => x.v.length);
  const iso = prox.reduce<typeof prox[number] | null>((a, x) => (a == null || (x.v[0].t as number) > (a.v[0].t as number) ? x : a), null);
  const perto = prox.reduce<typeof prox[number] | null>((a, x) => (a == null || (x.v[0].t as number) < (a.v[0].t as number) ? x : a), null);
  const vs = orig ? vizinhos(orig) : [];
  const linhasViz = prox.filter((x) => ui.comar === 'Todos' || comarDe(x.n) === ui.comar)
    .sort((a, b) => (b.v[0].t as number) - (a.v[0].t as number) || a.n.localeCompare(b.n, 'pt-BR'));

  const draw = (el: HTMLElement) => {
    const W = Math.max(260, el.clientWidth), rowH = 22, barH = 13, top = 4, bottom = 22;
    const H = top + vs.length * rowH + bottom;
    el.style.minHeight = H + 'px';
    const svg = makeSvg(el, W, H, 'Tempo e distância a partir do GBM de origem');
    const nameW = Math.min(W * 0.45, measure(svg, vs.map((v) => v.nome), 'mo-t'));
    const lab = (v: Viz) => `${fInt(v.t as number)} min · ${nz(v.km, fInt)} km`;
    const valW = measure(svg, vs.map(lab), 'mo-t-muted') + 8;
    const x0 = nameW + 12;
    const key = m === 'tempo' ? 't' : 'km';
    const x = d3.scaleLinear([0, Math.max(ext[m][1] || 1, raioAtual)], [x0, W - valW]);
    svg.append('line').attr('class', 'mo-ref').attr('x1', x(raioAtual)).attr('x2', x(raioAtual)).attr('y1', 0).attr('y2', H - bottom + 4);
    const t = `Raio ${fInt(raioAtual)} ${UN[m]}`;
    const lw = measure(svg, [t], 'mo-t-muted');
    svg.append('text').attr('class', 'mo-t-muted').attr('x', Math.max(x0 + lw / 2, Math.min(W - lw / 2, x(raioAtual)))).attr('y', H - 6).attr('text-anchor', 'middle').text(t);
    const g = svg.append('g').selectAll('g').data(vs).join('g')
      .attr('class', 'mo-row').attr('transform', (_d, i) => `translate(0,${top + i * rowH})`)
      .attr('tabindex', 0).attr('role', 'button').attr('aria-label', (d) => `${d.nome}: ${lab(d)}. Usar como origem`);
    g.append('rect').attr('class', 'mo-hit').attr('width', W).attr('height', rowH).attr('rx', 4);
    g.append('text').attr('class', 'mo-t').attr('x', 2).attr('y', rowH / 2).attr('dy', '0.35em').text((d) => d.nome).style('font-weight', (d) => (noRaio(d) ? 600 : null));
    g.append('rect').attr('x', x0).attr('y', (rowH - barH) / 2).attr('height', barH).attr('rx', 3)
      .attr('width', (d) => Math.max(0, x(d[key] ?? 0) - x0)).style('fill', (d) => cor(m, d[key]) || 'color-mix(in srgb, var(--fg) 7%, var(--panel))')
      .style('stroke', 'color-mix(in srgb, var(--fg) 18%, transparent)').style('stroke-width', 0.5);
    g.append('text').attr('class', 'mo-t-muted').attr('x', (d) => x(d[key] ?? 0) + 6).attr('y', rowH / 2).attr('dy', '0.35em').text(lab);
    g.on('click', (_ev, d) => { setOrigem(d.d); setCel(null); })
      .on('keydown', (ev: KeyboardEvent, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setOrigem(d.d); setCel(null); } });
  };

  const info = (o: string | null, d: string | null) => {
    if (!o || !d || o === d || !ok) return 'Selecione uma célula para ver ida e volta.';
    const ida = [val('dist', o, d), val('tempo', o, d)], volta = [val('dist', d, o), val('tempo', d, o)];
    return <><b>{nomeDe(o)}</b> → <b>{nomeDe(d)}</b>{`: ida ${nz(ida[0], fInt)} km, ${nz(ida[1], fInt)} min. Volta ${nz(volta[0], fInt)} km, ${nz(volta[1], fInt)} min.`}</>;
  };
  const infoAtiva = cel ? info(cel[0], cel[1]) : hov ? info(hov.o, hov.d) : info(null, null);

  const tabela = (k: Medida) => {
    const M = mat(k);
    if (!M) return null;
    const cols = M.cols;
    const comCols = cols.map(comarDe);
    let prev: string | null = null;
    const rowsM = M.rows.filter((r) => ui.comar === 'Todos' || comarDe(r.nome) === ui.comar);
    return (
      <table className="mo-table mo-td" onMouseLeave={() => setHov(null)}>
        <thead>
          <tr className="mo-cols">
            <th>Origem ↓ · destino →</th>
            {cols.map((c, j) => <th key={c} title={c} className={j > 0 && comCols[j] !== comCols[j - 1] ? 'ds-gs' : undefined}>{curtoGbm(c)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rowsM.map((r) => {
            const o = canon(r.nome);
            const com = comarDe(r.nome);
            const cls = [o === orig ? 'is-sel' : '', prev != null && com !== prev ? 'ds-gt' : ''].filter(Boolean).join(' ');
            prev = com;
            return (
              <tr key={r.nome} className={cls || undefined}>
                <th><button type="button" onClick={() => { setOrigem(o); setCel(null); }}>{r.nome}</button></th>
                {r.v.map((v, j) => {
                  const d = canon(cols[j]);
                  const c: string[] = [];
                  if (j > 0 && comCols[j] !== comCols[j - 1]) c.push('ds-gs');
                  const diag = d === o || v == null;
                  if (diag) c.push('is-diag');
                  if (cel && cel[0] === o && cel[1] === d) c.push('is-cel');
                  if (hov && hov.tab === k && hov.c === j) c.push('is-col');
                  return (
                    <td key={j} className={c.join(' ') || undefined} style={!diag ? { background: cor(k, v) } : undefined}
                      onMouseEnter={() => setHov({ tab: k, c: j, o, d })}
                      onClick={() => { if (o !== d) setCel([o, d]); }}>{diag ? '—' : fInt(v as number)}</td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const erro = !ok && params && !params.data ? 'A aba Parâmetros não pôde ser lida.' : !ok && params ? 'As tabelas "Distância entre GBMs (km)" e "Tempo de deslocamento entre GBMs (min)" não foram encontradas na aba Parâmetros.' : undefined;

  return (
    <div className="mo-page">
      {erro && <PageErr titulo="Não foi possível ler as distâncias." msg={erro} />}
      <p className="mo-lede">Tempo e distância entre os GBMs. Mais isolado: <b>{iso ? iso.n : '—'}</b>. O GBM mais próximo dele é o <b>{iso ? iso.v[0].nome : '—'}</b>, a <b>{iso ? fInt(iso.v[0].t as number) : '—'}</b> min. Menos isolado: <b>{perto ? perto.n : '—'}</b>, a <b>{perto ? fInt(perto.v[0].t as number) : '—'}</b> min do <b>{perto ? perto.v[0].nome : '—'}</b>.</p>
      <div className="ds-ctrl">
        <label htmlFor="ds-origem">Origem <select id="ds-origem" value={orig ?? ''} onChange={(e) => { setOrigem(e.target.value); setCel(null); }}>
          {nomes.map((n) => <option key={n} value={canon(n)}>{n}</option>)}
        </select></label>
        <Tabs<Medida> label="Medida" value={m} onChange={setM} items={[{ k: 'tempo', nome: 'Tempo (min)' }, { k: 'dist', nome: 'Distância (km)' }]} />
        <label htmlFor="ds-raio">Raio de apoio <input id="ds-raio" type="range" min={cfg.min} max={cfg.max} step={1} value={raioAtual} onChange={(e) => setRaio((r) => ({ ...r, [m]: Number(e.target.value) }))} /> <output htmlFor="ds-raio">{fInt(raioAtual)}</output> <span>{UN[m]}</span></label>
      </div>

      <div className="mo-row2 is-even">
        <Card id="ds-saida">
          <CardHead title={<>Saída do <span>{orig ? nomeDe(orig) : '—'}</span></>} tip={`Valores de ida.
Fonte: aba Parâmetros, tabelas «Distância entre GBMs (km)» e «Tempo de deslocamento entre GBMs (min)».`}
            note={<>Destinos do mais perto ao mais longe. Linha tracejada = raio de apoio. GBMs no raio: <b>{ok ? fInt(vs.filter(noRaio).length) : '—'}</b>.</>} />
          {ok && <D3Chart id="ch-ds" draw={draw} deps={[par, orig, m, raioAtual, ui.comar]} />}
          <Legend>
            <span className="ta-scale">Cor <i className="ta-grad ta-grad-dem" /> perto → longe</span>
            <span className="mo-key"><i className="mo-sw is-dash" />Raio de apoio</span>
          </Legend>
        </Card>
        <Card id="ds-vizinhos">
          <CardHead title="GBM mais próximo" tip={`Isolamento = tempo até o GBM mais próximo.
«No raio» = GBMs dentro do raio de apoio.
Fonte: aba Parâmetros.`} note="Do mais isolado ao menos isolado. Selecione um GBM para usá-lo como origem." />
          <div className="mo-table-wrap">
            <table className="mo-table mo-tr">
              <thead><tr className="mo-cols"><th className="l">GBM</th><th className="l gs">Mais próximo</th><th className="n">Min</th><th className="n">Km</th><th className="l gs">2º mais próximo</th><th className="n">Min</th><th className="n gs">No raio</th></tr></thead>
              <tbody>
                {linhasViz.map((x) => {
                  const [a, b] = x.v;
                  return (
                    <tr key={x.n} className={canon(x.n) === orig ? 'is-sel' : undefined} onClick={() => {
                      setOrigem(canon(x.n)); setCel(null);
                      const c = document.getElementById('ds-saida');
                      if (c && c.getBoundingClientRect().top < 0) c.scrollIntoView({ block: 'start', behavior: 'smooth' });
                    }}>
                      <td className="l">{x.n}</td><td className="l gs">{a.nome}</td><td className="n" style={{ background: cor('tempo', a.t) }}>{fInt(a.t as number)}</td><td className="n">{nz(a.km, fInt)}</td>
                      <td className="l gs">{b ? b.nome : '—'}</td><td className="n" style={b ? { background: cor('tempo', b.t) } : undefined}>{b ? fInt(b.t as number) : '—'}</td>
                      <td className="n gs">{fInt(x.v.filter(noRaio).length)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {(['dist', 'tempo'] as Medida[]).map((k) => (
        <Card key={k} id={k === 'dist' ? 'ds-matriz' : 'ds-matriz-tempo'}>
          <CardHead title={k === 'dist' ? 'Matriz de distância (km)' : 'Matriz de tempo (min)'}
            tip={`Fonte: aba Parâmetros, tabela «${k === 'dist' ? 'Distância entre GBMs (km)' : 'Tempo de deslocamento entre GBMs (min)'}».
Ida e volta podem ter valores diferentes.`} note="Linha = origem. Coluna = destino. Azul = perto. Laranja = longe." />
          <p className="ds-info">{infoAtiva}</p>
          <div className="mo-table-wrap" style={{ maxHeight: '75vh' }}>{ok && tabela(k)}</div>
        </Card>
      ))}
    </div>
  );
}
