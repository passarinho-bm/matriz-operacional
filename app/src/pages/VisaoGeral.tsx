import type { AbsRow, Resumo } from '@shared/types';
import { Fragment } from 'react';
import { drawBullet, drawCarga, drawRanking, drawSaldos } from '../charts/visaoGeral';
import { Card, CardHead, Icon, Legend, Sign, Tabs, Tip } from '../components/bits';
import { D3Chart } from '../components/D3Chart';
import { BASE, INTER, fmt, iconeDe, nomeViatura } from '../format';
import { linhaSel, linhas, gbmSel } from '../derived';
import { useData } from '../data';
import { useUi, type MedidaSaldo } from '../ui';

const FROTA_ROTULO: Record<string, string> = { ur: 'UR', ur_gsv: 'UR (GSV) / Reforço', vme: 'VME', vme2: '2ª VME', apoio_ar: 'Apoio AR', vci: 'VCI', vs: 'VS', vpa: 'VPA', ve: 'VE', apoio: 'Apoio' };
const CHIP_ROTULO: Record<string, string> = { ur: 'VAPH', ur_gsv: 'VAPH reforço', vme: 'VME', vme2: '2ª VME', apoio_ar: 'Apoio sem efetivo', vci: 'VCI', vs: 'VS', vpa: 'VPA', ve: 'VE', apoio: 'Apoio' };
const TERMOS: [string, React.ReactNode][] = [
  ['Efetivo necessário', 'Militares para as viaturas da matriz. Inclui 30% de afastamento.'],
  ['Saldo efetivo', 'Efetivo atual − efetivo necessário. Valor negativo = falta de militares.'],
  ['Saldo considerado', 'Saldo efetivo + oficial de dia + cotas de GSV 12h.'],
  ['Relação alvo (Ralvo)', null],
  ['Coeficiente de ajuste', 'Carga do GBM ÷ Ralvo. Valor acima de 1 = carga acima da referência.'],
  ['Novo efetivo necessário', 'Ocorrências ÷ Ralvo. O mínimo é 69 militares.'],
  ['Saldo pela carga', 'Efetivo atual − novo efetivo necessário.'],
  ['Matriz de risco', 'Pontos de 4 critérios: demanda, isolamento, potencial de demanda e riscos estruturais.'],
];

const Num = ({ v, kind = 'int', sign }: { v: number | null | undefined; kind?: string; sign?: boolean }) => {
  const t = v == null ? '—' : fmt(kind, v);
  return sign ? <Sign v={v}>{t}</Sign> : <>{t}</>;
};

export function VisaoGeral() {
  const { matriz } = useData();
  const ui = useUi();
  const all: AbsRow[] = matriz?.data?.rows ?? [];
  const resumo = matriz?.data?.resumo ?? [];
  const frota = matriz?.data?.frota ?? [];
  const res: Resumo | undefined = resumo.find((r) => r.comar === ui.comar);
  const resTodos = resumo.find((r) => r.comar === 'Todos');
  const rs = linhas(all, ui.comar);
  const sel = gbmSel(all, ui.comar, ui.gbm);
  const g = linhaSel(all, ui.comar, ui.gbm);
  const ralvo = all.find((r) => r.ralvo != null)?.ralvo;
  const posRisco = g ? 1 + all.filter((o) => (o.matriz_risco ?? -1) > (g.matriz_risco ?? -1)).length : null;
  const semDeficit = !!res && (res.pior_saldo_carga == null || res.pior_saldo_carga >= 0);
  const ctx = { all, rs, sel, onPick: (x: string) => ui.pick(x) };
  const saldoNota: Record<MedidaSaldo, string> = {
    saldo_efetivo: 'Efetivo atual − efetivo necessário.',
    saldo_considerado: 'Saldo efetivo + oficial de dia + cotas de GSV.',
    saldo_carga: 'Efetivo atual − novo efetivo necessário.',
  };
  const chip = (col: keyof AbsRow) => {
    const m = g ? (g[col] as string) : '';
    if (!m) return null;
    return (
      <li className="mo-chip" key={col} data-tip={nomeViatura(m)}>
        <Icon id={iconeDe(m)} /><span className="mo-chip-v">{m}</span><span className="mo-chip-k">{CHIP_ROTULO[col]}</span>
      </li>
    );
  };
  const frotaRow = (cat: string) => {
    const r = frota.find((o) => o.comar === ui.comar && o.categoria === cat);
    const pct = r && r.gbms ? Math.min(100, (100 * r.qtd) / r.gbms) : 0;
    return (
      <div className="mo-frota-row" key={cat}>
        <span className="mo-frota-cat">{FROTA_ROTULO[cat]}</span>
        <span className="mo-frota-bar"><i style={{ width: pct + '%' }} /></span>
        <span className="mo-frota-qtd"><b>{r ? fmt('int', r.qtd) : '—'}</b> de <span>{r ? fmt('int', r.gbms) : '—'}</span></span>
        <span className="mo-frota-mod">{r?.modelos ?? ''}</span>
      </div>
    );
  };
  const sinal = (v: number | null | undefined, d: string) => (v == null ? '' : fmt('signed', v) || d);

  return (
    <div className="mo-page">
      <p className="mo-lede">
        {ui.comar === 'Todos' ? <span className="mo-rec">Matriz completa:</span> : <span className="mo-rec">COMAR {ui.comar}:</span>}{' '}
        <b>{res ? fmt('int', res.gbms_deficit_considerado) : '—'}</b> de <b>{res ? fmt('int', res.gbms) : '—'}</b> GBMs têm saldo considerado negativo.{' '}
        O déficit total é de <b>{res ? fmt('int', res.deficit_considerado) : '—'}</b> militares.{' '}
        {semDeficit
          ? <span className="mo-pior">Pela carga, nenhum GBM tem déficit.</span>
          : <span className="mo-pior">Pela carga, o maior déficit é do <b>{res?.pior_gbm_carga ?? '—'}</b>: <b>{res ? sinal(res.pior_saldo_carga, '0') : '—'}</b>.</span>}
      </p>

      <section className="mo-kpis" id="indicadores" aria-label="Indicadores do recorte">
        <div className="mo-kpi">
          <p className="mo-kpi-label">Efetivo atual <Tip>{`Fonte: aba Absoluto.
Efetivo atual: coluna «Efetivo Atual».
Necessário: coluna «Efetivo Necessário (com 30% de afast.)».
O necessário inclui 30% de afastamento.`}</Tip></p>
          <p className="mo-kpi-value"><span>{res ? fmt('int', res.efetivo_atual) : '—'}</span></p>
          <p className="mo-kpi-note">Necessário: <b>{res ? fmt('int', res.efetivo_necessario) : '—'}</b></p>
        </div>
        <div className="mo-kpi">
          <p className="mo-kpi-label">Saldo efetivo <Tip>{`Saldo efetivo = efetivo atual − efetivo necessário.
Fonte: aba Absoluto, coluna «Saldo Efetivo».`}</Tip></p>
          <p className="mo-kpi-value"><span><Num v={res?.saldo_efetivo} kind="signed" sign /></span></p>
          <p className="mo-kpi-note"><b>{res ? fmt('int', res.gbms_deficit_efetivo) : '—'}</b> GBMs com saldo negativo</p>
        </div>
        <div className="mo-kpi">
          <p className="mo-kpi-label">Saldo considerado <Tip>{`Saldo considerado = saldo efetivo + oficial de dia + cotas de GSV 12h.
Fonte: aba Absoluto, coluna «Saldo Considerado».`}</Tip></p>
          <p className="mo-kpi-value"><span><Num v={res?.saldo_considerado} kind="signed" sign /></span></p>
          <p className="mo-kpi-note"><b>{res ? fmt('int', res.gbms_deficit_considerado) : '—'}</b> GBMs com saldo negativo</p>
        </div>
        <div className="mo-kpi">
          <p className="mo-kpi-label">Saldo pela carga <Tip>{`Saldo pela carga = efetivo atual − novo efetivo necessário.
O novo efetivo necessário vem da carga de ocorrências.
Fonte: aba Absoluto, colunas «Novo Efetivo Necessário» e «Saldo Efetivo pelo Índice de Carga Operacional».`}</Tip></p>
          <p className="mo-kpi-value"><span><Num v={res?.saldo_carga} kind="signed" sign /></span></p>
          <p className="mo-kpi-note">Novo necessário: <b>{res ? fmt('int', res.novo_efetivo) : '—'}</b> · <b>{res ? fmt('int', res.gbms_deficit_carga) : '—'}</b> GBMs com saldo negativo</p>
        </div>
        <div className="mo-kpi">
          <p className="mo-kpi-label">Viaturas <Tip>{`Contagem das viaturas nas colunas de viaturas da aba Absoluto.
Inclui o AR de apoio.`}</Tip></p>
          <p className="mo-kpi-value"><span>{res ? fmt('int', res.viaturas) : '—'}</span></p>
          <p className="mo-kpi-note">Socorro base: <b>{res ? fmt('int', res.viaturas_base) : '—'}</b> · Intermediário: <b>{res ? fmt('int', res.viaturas_intermediario) : '—'}</b></p>
        </div>
      </section>

      <div className="mo-row2">
        <Card id="ranking">
          <CardHead title="Matriz de risco" tip={`Pontos de cada GBM.
Fonte: aba Absoluto, coluna «Matriz de Risco».
O cálculo está na aba «Matriz de risco» deste painel.`} note="Selecione um GBM para ver a ficha." />
          <D3Chart id="ch-ranking" draw={(el) => drawRanking(el, ctx)} deps={[all, ui.comar, sel]} />
        </Card>

        <Card id="ficha">
          <div className="mo-card-head">
            <p className="mo-eyebrow">Ficha do GBM <Tip>Fonte: aba Absoluto, linha do GBM.</Tip></p>
            <h2 className="mo-ficha-nome"><span>{g?.gbm ?? '—'}</span></h2>
            <p className="mo-sub">COMAR <span>{g?.comar ?? '—'}</span> · <span>{posRisco ?? '—'}</span>º de <span>{resTodos ? fmt('int', resTodos.gbms) : '—'}</span> na matriz de risco</p>
          </div>
          <div className="mo-vtr">
            <div className="mo-vtr-group">
              <p className="mo-sub">Socorro base</p>
              <ul className="mo-chips">{BASE.map((c) => chip(c))}</ul>
            </div>
            <div className="mo-vtr-group">
              <p className="mo-sub">Intermediário</p>
              <ul className="mo-chips">{INTER.map((c) => chip(c))}</ul>
              {g && !INTER.some((k) => g[k]) && <p className="mo-sub">Sem viaturas no intermediário.</p>}
            </div>
          </div>
          <D3Chart id="ch-bullet" className="mo-bullet" draw={(el) => drawBullet(el, all, g)} deps={[all, g]} />
          <Legend>
            <span className="mo-key"><i className="mo-sw is-acc" />Efetivo atual</span>
            <span className="mo-key"><i className="mo-sw is-line" />Necessário</span>
            <span className="mo-key"><i className="mo-sw is-dash" />Novo necessário (carga)</span>
          </Legend>
          <dl className="mo-dl">
            <div><dt>Efetivo necessário</dt><dd><Num v={g?.efetivo_necessario} /></dd></div>
            <div><dt>Efetivo atual</dt><dd><Num v={g?.efetivo_atual} /></dd></div>
            <div><dt>Novo efetivo necessário</dt><dd><Num v={g?.novo_efetivo} /></dd></div>
            <div><dt>Saldo efetivo</dt><dd><Num v={g?.saldo_efetivo} kind="signed" sign /></dd></div>
            <div><dt>Saldo considerado</dt><dd><Num v={g?.saldo_considerado} kind="signed" sign /></dd></div>
            <div><dt>Saldo pela carga</dt><dd><Num v={g?.saldo_carga} kind="signed" sign /></dd></div>
            <div><dt>Oficial de dia</dt><dd>{g?.oficial_dia || 'Não'}</dd></div>
            <div><dt>Cotas de GSV 12h</dt><dd>{g?.cotas_gsv ? fmt('int', g.cotas_gsv) : 'Nenhuma'}</dd></div>
            <div><dt>Coeficiente de ajuste</dt><dd><Num v={g?.coef_ajuste} kind="dec2" /></dd></div>
            <div><dt>Matriz de risco</dt><dd><Num v={g?.matriz_risco} kind="dec2" /></dd></div>
            <div><dt>Carga atual</dt><dd><Num v={g?.carga_atual} kind="dec2" /></dd></div>
            <div><dt>Carga atualizada</dt><dd><Num v={g?.carga_atualizada} kind="dec2" /></dd></div>
          </dl>
          <p className="mo-sub">Ranking de ocorrências (12 meses) <Tip>{`Posição entre os 24 GBMs. 1º = mais ocorrências.
Fonte: aba Absoluto, colunas «Ranking…».
Origem: aba Parâmetros, dados GESINT.`}</Tip></p>
          <dl className="mo-dl">
            <div><dt>Ocorrências</dt><dd><Num v={g?.rk_ocorrencias} kind="ord" /></dd></div>
            <div><dt>UR</dt><dd><Num v={g?.rk_ur} kind="ord" /></dd></div>
            <div><dt>Multiemprego</dt><dd><Num v={g?.rk_multiemprego} kind="ord" /></dd></div>
            <div><dt>Multiemprego c/ florestal</dt><dd><Num v={g?.rk_multiemprego_florestal} kind="ord" /></dd></div>
            <div><dt>Incêndio estrutural</dt><dd><Num v={g?.rk_incendio} kind="ord" /></dd></div>
          </dl>
        </Card>
      </div>

      <div className="mo-row2 is-even">
        <Card id="saldos">
          <CardHead title="Saldo de efetivo" tip="Fonte: aba Absoluto, colunas «Saldo Efetivo», «Saldo Considerado» e «Saldo Efetivo pelo Índice de Carga Operacional»." note={saldoNota[ui.saldo]} />
          <Tabs<MedidaSaldo> label="Medida de saldo" value={ui.saldo} onChange={ui.setSaldo}
            items={[{ k: 'saldo_efetivo', nome: 'Saldo efetivo' }, { k: 'saldo_considerado', nome: 'Saldo considerado' }, { k: 'saldo_carga', nome: 'Saldo pela carga' }]} />
          <D3Chart id="ch-saldos" draw={(el) => drawSaldos(el, ctx, ui.saldo)} deps={[all, ui.comar, sel, ui.saldo]} />
          <Legend>
            <span className="mo-key"><i className="mo-sw is-neg" />Déficit</span>
            <span className="mo-key"><i className="mo-sw" />Sobra</span>
          </Legend>
        </Card>

        <Card id="carga-militar">
          <CardHead title="Carga por militar" tip={`Carga = ocorrências ÷ militares.
Fonte: aba Absoluto, colunas «Carga Operacional com Efetivo Atual» e «Carga Operacional - Atualizada».
Ralvo: coluna «Relação Alvo (Ralvo)».`} note="Linha tracejada: Ralvo, a carga de referência." />
          <D3Chart id="ch-carga" draw={(el) => drawCarga(el, ctx)} deps={[all, ui.comar, sel]} />
          <Legend>
            <span className="mo-key"><i className="mo-sw is-dot is-acc" />Carga atual</span>
            <span className="mo-key"><i className="mo-sw is-dot is-acc2" />Carga atualizada</span>
            <span className="mo-key"><i className="mo-sw is-dash" />Ralvo</span>
          </Legend>
        </Card>
      </div>

      <div className="mo-row2 is-even">
        <Card id="frota">
          <CardHead title="Frota" tip="Contagem por coluna de viatura da aba Absoluto." note="Viaturas por posição e por modelo." />
          <div className="mo-frota">
            <p className="mo-frota-grp">Socorro base</p>
            {BASE.map(frotaRow)}
            <p className="mo-frota-grp">Intermediário</p>
            {INTER.map(frotaRow)}
          </div>
        </Card>
        <Card id="como-ler">
          <CardHead title="Termos" note="Termos das colunas da aba Absoluto." />
          <dl className="mo-defs">
            {TERMOS.map(([k, v]) => (
              <Fragment key={k}>
                <div><dt>{k}</dt><dd>{v ?? <><b>{ralvo != null ? fmt('int', ralvo) : '—'}</b> ocorrências por militar. É a referência para equalizar o efetivo.</>}</dd></div>
              </Fragment>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  );
}
