import * as d3 from 'd3';
import type { AbsRow } from '@shared/types';
import { useMemo, useState } from 'react';
import { Card, Icon, Tip, VtChip } from '../components/bits';
import { fmt, fold, kindOf, KIND } from '../format';
import { gbmSel, linhas } from '../derived';
import { useData } from '../data';
import { useUi } from '../ui';

interface Grupo { id: string; nome: string; cols: string[]; sub?: { nome: string; cols: string[]; sep?: boolean }[] }
const GRUPOS: Grupo[] = [
  { id: 'id', nome: '', cols: ['numero', 'gbm', 'comar'] },
  { id: 'viat', nome: 'Viaturas', cols: ['ur', 'ur_gsv', 'vme', 'vme2', 'vci', 'vs', 'vpa', 've', 'apoio'],
    sub: [{ nome: 'Socorro base', cols: ['ur', 'ur_gsv', 'vme', 'vme2'] }, { nome: 'Socorro intermediário', cols: ['vci', 'vs', 'vpa', 've', 'apoio'], sep: true }] },
  { id: 'efet', nome: 'Efetivo e saldos', cols: ['efetivo_necessario', 'efetivo_atual', 'saldo_efetivo', 'oficial_dia', 'cotas_gsv', 'saldo_considerado'] },
  { id: 'equal', nome: 'Equalização de efetivo', cols: ['ralvo', 'coef_ajuste', 'novo_efetivo', 'saldo_carga'] },
  { id: 'risco', nome: 'Risco e carga', cols: ['matriz_risco', 'carga_atual', 'carga_atualizada'] },
  { id: 'rank', nome: 'Ranking de ocorrências (12 meses)', cols: ['rk_ocorrencias', 'rk_ur', 'rk_multiemprego', 'rk_multiemprego_florestal', 'rk_incendio'] },
];
const ROT: Record<string, string> = {
  numero: 'Nº', gbm: 'GBM', comar: 'COMAR', ur: 'UR', ur_gsv: 'UR (GSV) / Reforço', vme: 'VME', vme2: '2ª VME', apoio_ar: 'Apoio AR',
  vci: 'VCI', vs: 'VS', vpa: 'VPA', ve: 'VE', apoio: 'Apoio', efetivo_necessario: 'Efetivo necessário (30% afast.)', efetivo_atual: 'Efetivo atual',
  saldo_efetivo: 'Saldo efetivo', oficial_dia: 'Oficial de dia', cotas_gsv: 'Cotas GSV 12h', saldo_considerado: 'Saldo considerado',
  ralvo: 'Ralvo', coef_ajuste: 'Coef. de ajuste', novo_efetivo: 'Novo efetivo necessário', saldo_carga: 'Saldo pela carga',
  matriz_risco: 'Matriz de risco', carga_atual: 'Carga com efetivo atual', carga_atualizada: 'Carga atualizada',
  rk_ocorrencias: 'Ocorrências', rk_ur: 'UR', rk_multiemprego: 'Multiemprego', rk_multiemprego_florestal: 'Multiemprego c/ florestal', rk_incendio: 'Incêndio estrutural',
};
const COLTIP: Record<string, string> = {
  numero: 'Número do GBM, tirado do nome. Serve para ordenar a tabela. O Sierra III recebe 37,1.',
  gbm: 'Nome do GBM ou da unidade destacada, com a cidade da sede.',
  comar: 'Comando de Área (COMAR I a IV) ao qual o GBM pertence.',
  ur: 'Unidade de Resgate. Viatura de atendimento pré-hospitalar (APH) e de acidente de trânsito. Tem guarnição fixa do GBM.',
  ur_gsv: 'UR extra de reforço. Militares em serviço voluntário (GSV) fazem a guarnição. Não entra no efetivo necessário.',
  vme: 'Viatura multiemprego principal (ASE, ABT ou ABSL). Atende incêndio e salvamento. É a base do socorro do GBM.',
  vme2: 'Segunda viatura multiemprego. Permite atender duas ocorrências de incêndio ou salvamento ao mesmo tempo.',
  apoio_ar: 'Auto Rápido de apoio, sem guarnição própria.',
  vci: 'Viatura de combate a incêndio (por exemplo, ABT). Socorro intermediário: reforça o socorro base em incêndios maiores.',
  vs: 'Viatura de salvamento (por exemplo, ABSL), com equipamentos de desencarceramento e salvamento. Socorro intermediário.',
  vpa: 'Viatura de proteção ambiental, com tração 4x4. Atende incêndio florestal e áreas de vegetação. Socorro intermediário.',
  ve: 'Viatura especial para altura (por exemplo, AEM). Atende edificações altas e salvamentos complexos. Socorro intermediário.',
  apoio: 'Viatura pesada de apoio (AT ou APSG). Leva água e faz apoio logístico na ocorrência. Socorro intermediário.',
  efetivo_necessario: 'Militares que o GBM precisa ter. Soma as guarnições das viaturas da matriz, a SECOM e o serviço interno, mais 30% para afastamentos (férias, licenças e dispensas). Depois soma o expediente.',
  efetivo_atual: 'Bombeiros militares lotados hoje no GBM.',
  saldo_efetivo: 'Efetivo atual − efetivo necessário. Negativo (vermelho) = faltam militares. Positivo (verde) = sobram militares.',
  oficial_dia: 'SIM = o GBM tem escala de oficial de dia (unidade polo do COMAR). O oficial de dia entra no saldo considerado e na carga atualizada.',
  cotas_gsv: 'Cotas diárias de 12 h de serviço voluntário (GSV) do GBM. As cotas reforçam o efetivo e entram no saldo considerado.',
  saldo_considerado: 'Saldo efetivo + reforço do oficial de dia + reforço das cotas de GSV, arredondado. Mostra o saldo com os reforços.',
  ralvo: 'Relação alvo: total de ocorrências ÷ total do efetivo atual do CBMDF. É a carga média por militar. O valor é o mesmo para todos os GBMs.',
  coef_ajuste: '(Ocorrências do GBM ÷ efetivo atual) ÷ Ralvo. Maior que 1 = carga acima da média. Menor que 1 = carga abaixo da média.',
  novo_efetivo: 'Ocorrências do GBM ÷ Ralvo, arredondado. Mínimo de 69. É o efetivo que deixa o GBM na carga média.',
  saldo_carga: 'Efetivo atual − novo efetivo necessário. Negativo = o GBM precisa de mais militares para ficar na carga média.',
  matriz_risco: 'Pontos de risco da área do GBM. Soma 4 critérios: demanda operacional (peso 2), isolamento, potencial demográfico e econômico, e riscos estruturais. Mais pontos = mais risco.',
  carga_atual: 'Ocorrências do GBM ÷ efetivo atual. Mostra quantas ocorrências cada militar atende hoje.',
  carga_atualizada: 'Ocorrências do GBM ÷ (efetivo necessário + oficial de dia + cotas de GSV). Mostra a carga com o efetivo da matriz.',
  rk_ocorrencias: 'Posição do GBM no total de ocorrências dos últimos 12 meses. 1º = GBM com mais ocorrências.',
  rk_ur: 'Posição do GBM nas ocorrências de UR dos últimos 12 meses: APH, suporte básico de vida e acidente de trânsito. 1º = mais ocorrências.',
  rk_multiemprego: 'Posição do GBM nas ocorrências de incêndio e salvamento dos últimos 12 meses, sem emergência médica. 1º = mais ocorrências.',
  rk_multiemprego_florestal: 'Posição do GBM nas ocorrências multiemprego dos últimos 12 meses, com incêndio florestal e em vegetação. 1º = mais ocorrências.',
  rk_incendio: 'Posição do GBM nas ocorrências de incêndio em edificações dos últimos 12 meses (residencial, comercial, industrial e institucional). 1º = mais ocorrências.',
};

const ABS_COLS = GRUPOS.flatMap((g) => g.cols);
const GRP_OF: Record<string, { g: string; first: boolean; sep?: boolean }> = Object.fromEntries(GRUPOS.flatMap((g) => g.cols.map((c, i) => [c, { g: g.id, first: i === 0 }])));
GRUPOS.forEach((g) => (g.sub || []).forEach((sg) => { if (sg.sep) GRP_OF[sg.cols[0]].sep = true; }));
const VIATS = new Set(GRUPOS[1].cols);
const SALDOS = new Set(['saldo_efetivo', 'saldo_considerado', 'saldo_carga']);
const DEMANDA = new Set(['matriz_risco', 'carga_atual', 'carga_atualizada', 'coef_ajuste']);
const RANKS = new Set(GRUPOS[5].cols);
const SOMA = new Set(['efetivo_necessario', 'efetivo_atual', 'saldo_efetivo', 'cotas_gsv', 'saldo_considerado', 'novo_efetivo', 'saldo_carga']);
const clsCol = (c: string, extra = '') => {
  const gi = GRP_OF[c];
  return ['c-' + c, 'g-' + gi.g, gi.first && gi.g !== 'id' ? 'g-start' : '', gi.sep ? 'g-sep' : '', VIATS.has(c) || c === 'comar' || c === 'oficial_dia' ? 't-l' : '', extra].filter(Boolean).join(' ');
};
const GRP_BTN: { k: string; nome: string }[] = [
  { k: 'viat', nome: 'Viaturas' }, { k: 'efet', nome: 'Efetivo e saldos' }, { k: 'equal', nome: 'Equalização' }, { k: 'risco', nome: 'Risco e carga' }, { k: 'rank', nome: 'Ranking de ocorrências' },
];

type Dir = 'asc' | 'desc' | null;
const val = (r: AbsRow, c: string) => (r as unknown as Record<string, unknown>)[c];

export function Matriz() {
  const { matriz } = useData();
  const ui = useUi();
  const all = matriz?.data?.rows ?? [];
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState<{ field: string | null; dir: Dir }>({ field: null, dir: null });
  const [ocultos, setOcultos] = useState<Set<string>>(new Set());
  const sel = gbmSel(all, ui.comar, ui.gbm);

  const clicaOrdem = (c: string) => {
    const asc = !(KIND[c] && KIND[c] !== 'ord') || RANKS.has(c);
    const first: Dir = asc ? 'asc' : 'desc';
    setOrdem((o) => (o.field === c ? (o.dir === first ? { field: c, dir: asc ? 'desc' : 'asc' } : { field: null, dir: null }) : { field: c, dir: first }));
  };

  const { rs, ext, maxAbs } = useMemo(() => {
    let r = linhas(all, ui.comar).slice();
    const q = fold(busca).trim();
    if (q) r = r.filter((x) => fold(ABS_COLS.map((c) => val(x, c) ?? '').join(' ')).includes(q));
    if (ordem.field) {
      const f = ordem.field, sg = ordem.dir === 'asc' ? 1 : -1;
      r.sort((a, b) => {
        const va = val(a, f), vb = val(b, f);
        const ea = va == null || va === '', eb = vb == null || vb === '';
        if (ea && eb) return 0;
        if (ea) return 1;
        if (eb) return -1;
        return typeof va === 'number' && typeof vb === 'number' ? sg * (va - vb) : sg * String(va).localeCompare(String(vb), 'pt-BR', { numeric: true });
      });
    }
    const e: Record<string, [number | undefined, number | undefined]> = {};
    [...DEMANDA, ...RANKS].forEach((c) => { e[c] = d3.extent(all, (d) => val(d, c) as number | null) as [number | undefined, number | undefined]; });
    const m: Record<string, number> = {};
    SALDOS.forEach((c) => { m[c] = d3.max(all, (d) => Math.abs((val(d, c) as number | null) ?? 0)) || 1; });
    return { rs: r, ext: e, maxAbs: m };
  }, [all, ui.comar, busca, ordem]);

  const bgDem = (c: string, v: number | null) => {
    if (v == null) return '';
    const [lo, hi] = ext[c];
    if (lo == null || hi == null || hi === lo) return '';
    let t = (v - lo) / (hi - lo);
    if (RANKS.has(c)) t = 1 - t;
    const d = t - 0.5, pct = Math.round(Math.abs(d) * 2 * 58);
    return pct < 5 ? '' : `color-mix(in srgb, var(${d > 0 ? '--hot' : '--cool'}) ${pct}%, var(--panel))`;
  };
  const bgSaldo = (c: string, v: number | null) => (v == null || v === 0 ? '' : `color-mix(in srgb, var(${v < 0 ? '--bad' : '--ok'}) ${Math.round(14 + 50 * Math.abs(v) / maxAbs[c])}%, var(--panel))`);
  const cls = ['mo-table', 'mo-ta', ...['viat', 'efet', 'equal', 'risco', 'rank'].filter((g) => ocultos.has(g)).map((g) => 'h-' + g)].join(' ');

  return (
    <div className="mo-page">
      <p className="mo-lede">Todas as colunas da aba Absoluto. Selecione um cabeçalho para ordenar. Selecione o <b>i</b> para ver o que a coluna mostra.</p>
      <Card id="tabela-absoluto">
        <div className="ta-tools">
          <input className="mo-search" type="search" placeholder="Buscar GBM ou viatura" aria-label="Buscar GBM ou viatura" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <div className="mo-tabs" role="group" aria-label="Grupos de colunas visíveis">
            {GRP_BTN.map((b) => (
              <button key={b.k} type="button" aria-pressed={!ocultos.has(b.k)}
                onClick={() => setOcultos((o) => { const n = new Set(o); if (n.has(b.k)) n.delete(b.k); else n.add(b.k); return n; })}>{b.nome}</button>
            ))}
          </div>
        </div>
        <div className="ta-legend">
          <span className="ta-scale">Saldo: déficit <i className="ta-grad ta-grad-saldo" /> sobra</span>
          <span className="ta-scale">Demanda: menor <i className="ta-grad ta-grad-dem" /> maior</span>
          <span className="ta-vlegend">
            {([['i-ur', 'UR', 'Unidade de Resgate'], ['i-ase', 'ASE', 'Auto Salvamento e Extinção'], ['i-abt', 'ABT', 'Auto Bomba Tanque'], ['i-absl', 'ABSL', 'Auto Busca e Salvamento Leve'],
              ['i-ar', 'AR', 'Auto Rápido'], ['i-aem', 'AEM', 'Auto Escada Mecânica'], ['i-at', 'AT', 'Auto Tanque'], ['i-apsg', 'APSG', 'Auto Plataforma de Serviços Gerais']] as const).map(([id, s, n]) => (
              <span className="mo-vt f-cbm" key={s} data-tip={`${s}: ${n}`}><Icon id={id} />{s}</span>
            ))}
          </span>
        </div>
        <div className="mo-table-wrap mo-ta-wrap">
          <table className={cls} id="mo-ta">
            <thead>
              <tr className="mo-groups">
                {GRUPOS.flatMap((g) => (g.sub || [{ nome: g.nome, cols: g.cols, sep: false }]).map((sg, i) => (
                  <th key={g.id + sg.nome} colSpan={sg.cols.length}
                    className={['g-' + g.id, g.id !== 'id' && i === 0 ? 'g-start' : '', sg.sep ? 'g-sep' : ''].filter(Boolean).join(' ')}>{sg.nome}</th>
                )))}
              </tr>
              <tr className="mo-cols">
                {ABS_COLS.map((c) => (
                  <th key={c} className={clsCol(c)} aria-sort={ordem.field === c ? (ordem.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" className="mo-sort" onClick={() => clicaOrdem(c)}>{ROT[c]}</button>
                    {COLTIP[c] && <button type="button" className="tip" aria-label="O que a coluna mostra" data-tip={COLTIP[c]}>i</button>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rs.map((r) => (
                <tr key={r.gbm} className={r.gbm === sel ? 'is-sel' : undefined} onClick={() => ui.setGbm(r.gbm)}>
                  {ABS_COLS.map((c) => {
                    const v = val(r, c);
                    const bg = SALDOS.has(c) ? bgSaldo(c, v as number | null) : DEMANDA.has(c) || RANKS.has(c) ? bgDem(c, v as number | null) : '';
                    return (
                      <td key={c} className={clsCol(c, SALDOS.has(c) ? 'is-saldo' : '')} style={bg ? { background: bg } : undefined}>
                        {VIATS.has(c) ? (v ? <VtChip m={v as string} /> : null)
                          : c === 'oficial_dia' ? (v ? <span className="mo-flag">{v as string}</span> : null)
                          : c === 'numero' ? (v == null ? '' : String(v))
                          : fmt(kindOf(c), v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              {rs.length > 0 && (
                <tr>
                  {ABS_COLS.map((c) => (
                    <td key={c} className={clsCol(c, SALDOS.has(c) ? 'is-saldo' : '')}>
                      {c === 'gbm' ? `Total (${fmt('int', rs.length)} GBMs)`
                        : VIATS.has(c) || c === 'oficial_dia' ? fmt('int', rs.filter((r) => val(r, c)).length)
                        : SOMA.has(c) ? fmt(kindOf(c), rs.reduce((a, r) => a + ((val(r, c) as number | null) ?? 0), 0)) : ''}
                    </td>
                  ))}
                </tr>
              )}
            </tfoot>
          </table>
          {rs.length === 0 && <p className="mo-empty">Nenhum GBM corresponde à busca.</p>}
        </div>
        <p className="mo-note">As cores comparam os 24 GBMs. A linha Total soma os GBMs visíveis.</p>
      </Card>
    </div>
  );
}
