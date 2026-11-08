import { useEffect, useRef, useState } from 'react';
import { avisosGuarnicao, condutoresAuto, curtoGuarnicao, divisao, guarnicao, PO, resumoGuarnicao, type Capacete } from '@shared/poder';
import { Card, CardHead, Icon } from '../components/bits';
import { fInt } from '../format';

const Capacetes = ({ crew, chave, prev, keys }: { crew: Capacete[]; chave: string; prev: Set<string>; keys: Set<string> }) => (
  <div className="po-crew">
    {crew.map((h, i) => {
      const k = chave + i;
      keys.add(k);
      return (
        <svg key={i} className={`po-helm ${h}${prev.has(k) ? '' : ' is-new'}`} role="img" aria-label={h === 'h2' ? 'condutor' : 'operacional'}><use href="#i-helm" /></svg>
      );
    })}
  </div>
);

export function Poder() {
  const [total, setTotalRaw] = useState<number>(PO.PADRAO);
  const [n, setN] = useState(10);
  const [c, setC] = useState(2);
  const [auto, setAuto] = useState(true);
  const [tocando, setTocando] = useState(false);
  const prevKeys = useRef<Set<string>>(new Set());
  const keys = new Set<string>();
  const timer = useRef<number | null>(null);
  const passos = useRef<HTMLDivElement>(null);

  const setTotal = (v: number) => { if (Number.isFinite(v)) setTotalRaw(Math.max(30, Math.min(200, Math.round(v)))); };
  const para = () => { if (timer.current) { window.clearInterval(timer.current); timer.current = null; } setTocando(false); };
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);
  const toca = () => {
    if (timer.current) { para(); return; }
    setN(3); setTocando(true);
    timer.current = window.setInterval(() => {
      setN((v) => {
        if (v >= 12) { window.clearInterval(timer.current as number); timer.current = null; setTocando(false); return v; }
        return v + 1;
      });
    }, 1500);
  };

  const div = divisao(total);
  const condutores = (nn: number) => (auto ? condutoresAuto(nn) : c);
  const cEf = condutores(n);
  const g = guarnicao(n, cEf);
  const msgs = avisosGuarnicao(g, n, cEf);
  const tamanhos = [...new Set(div.alas.map((a) => a.n))].sort((a, b) => a - b);
  const segs = [
    { k: 'Expediente', n: div.expediente, sc: 'color-mix(in srgb, var(--muted) 22%, var(--panel))', ala: false },
    { k: 'SECOM', n: div.secom, sc: 'color-mix(in srgb, var(--n3) 30%, var(--panel))', ala: false },
    { k: 'Escala de UR', n: div.escalaUr, sc: 'color-mix(in srgb, var(--n1) 32%, var(--panel))', ala: false },
    ...div.alas.map((a, i) => ({ k: a.nome, n: a.n, ala: true, sc: `color-mix(in srgb, var(--truck) ${44 - i * 6}%, var(--panel))` })),
  ].filter((s) => s.n > 0);

  useEffect(() => { prevKeys.current = keys; });
  useEffect(() => {
    const el = passos.current;
    const on = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!el || !on) return;
    const l = on.offsetLeft - el.offsetLeft, w = el.clientWidth;
    if (l < el.scrollLeft || l + on.offsetWidth > el.scrollLeft + w) el.scrollLeft = l - w / 2 + on.offsetWidth / 2;
  }, [n]);

  const prev = prevKeys.current;
  const novo = (k: string) => (prev.has(k) ? '' : ' is-new');
  const veic = (k: string) => { keys.add(k); return novo(k); };

  return (
    <div className="mo-page">
      <p className="mo-lede">Veja quantas viaturas a ala de serviço pode ativar. O exemplo usa o menor GBM: <b>{fInt(total)}</b> bombeiros. Mude o efetivo do GBM ou o efetivo da ala. Os bombeiros da ala <b>não incluem o militar de serviço de adjunto</b>.</p>

      <Card id="po-composicao">
        <CardHead title="Divisão do efetivo" tip={`Valores de referência do Comando Operacional:
expediente 6, SECOM 5, escala de UR 15.
O resto vai para as 4 alas.`} note="Expediente, SECOM e escala de UR saem primeiro. O resto vai para 4 alas. Selecione uma ala para simular." />
        <div className="po-total">
          <label htmlFor="po-total">Efetivo do GBM</label>
          <span className="po-num">
            <button type="button" aria-label="Diminuir efetivo" onClick={() => setTotal(total - 1)}>−</button>
            <input id="po-total" type="number" min={30} max={200} step={1} value={total} inputMode="numeric" onChange={(e) => { const v = Number(e.target.value); if (v >= 30 && v <= 200) setTotal(v); }} />
            <button type="button" aria-label="Aumentar efetivo" onClick={() => setTotal(total + 1)}>+</button>
          </span>
          <button type="button" className="mo-btn" onClick={() => { para(); setTotalRaw(PO.PADRAO); setN(10); setAuto(true); }}>Voltar para 69</button>
        </div>
        <div className="po-stack" role="group" aria-label="Divisão do efetivo">
          {segs.map((s) => {
            const st = { flex: `${s.n} 1 0`, ['--sc' as string]: s.sc };
            const inner = <><b>{fInt(s.n)}</b><span>{s.k}</span></>;
            return s.ala
              ? <button key={s.k} type="button" className="po-seg" style={st} title={`${s.k}: ${s.n}`} aria-pressed={n === s.n} aria-label={`Ala ${s.k}, ${s.n} bombeiros: simular`} onClick={() => { para(); setN(Math.max(2, Math.min(14, s.n))); }}>{inner}</button>
              : <div key={s.k} className="po-seg" style={st} title={`${s.k}: ${s.n}`}>{inner}</div>;
          })}
        </div>
        <p className="po-sum">
          <b>{fInt(total)}</b> bombeiros: <b>{fInt(PO.EXP)}</b> no expediente, <b>{fInt(PO.SECOM)}</b> na SECOM, <b>{fInt(PO.UR)}</b> na escala de UR e <b>{fInt(div.resto)}</b> nas 4 alas. Cada ala tem{' '}
          <b>{tamanhos.length > 1 ? `${tamanhos[0]} ou ${tamanhos[tamanhos.length - 1]}` : String(tamanhos[0] ?? 0)}</b> bombeiros: <span>{div.alas.map((a) => `${a.nome} ${a.n}`).join(', ')}.</span>
        </p>
      </Card>

      <Card id="po-simulador">
        <CardHead title="Viaturas da ala de serviço" tip={`Regras de guarnição do Comando Operacional. Veja o cartão «Regras de guarnição».
O número de bombeiros da ala não inclui o militar de serviço de adjunto.`} note="Bombeiros da ala para as viaturas, sem o adjunto de serviço. Mova o controle ou selecione uma faixa. Capacete laranja = condutor (QBMG-2). Capacete amarelo = operacional (QBMG-1)." />
        <div className="po-ctrl">
          <div className="po-n-row">
            <div className="po-n-big"><output htmlFor="po-n">{n}</output><span>bombeiros na ala<br />(sem o adjunto)</span></div>
            <p className="po-headline">{resumoGuarnicao(g)}</p>
          </div>
          <input className="po-range" id="po-n" type="range" min={2} max={14} step={1} value={n} aria-label="Bombeiros na ala de serviço, sem o adjunto" onChange={(e) => { para(); setN(Number(e.target.value)); }} />
          <div className="po-steps" role="group" aria-label="Faixas de efetivo" ref={passos}>
            {Array.from({ length: 11 }, (_, i) => i + 3).map((nn) => {
              const gg = guarnicao(nn, condutores(nn));
              return (
                <button key={nn} type="button" className="po-step" aria-pressed={nn === n} aria-label={`${nn} bombeiros: ${resumoGuarnicao(gg)}`} onClick={() => { para(); setN(nn); }}>
                  <b>{nn}</b>
                  <span className="po-step-ic">{gg.ase.map((_, i) => <Icon key={i} id="i-ase" className="mo-ic ase" />)}{gg.ar > 0 && <Icon id="i-ar" className="mo-ic ar" />}</span>
                  <small>{curtoGuarnicao(gg)}</small>
                </button>
              );
            })}
          </div>
          <div className="po-sub">
            <label htmlFor="po-c">Condutores (QBMG-2) na ala <input id="po-c" type="range" min={0} max={3} step={1} value={cEf} onChange={(e) => { setAuto(false); setC(Number(e.target.value)); }} /> <output htmlFor="po-c">{cEf}</output></label>
            {auto && <span>automático: 1 por viatura</span>}
            {!auto && <button type="button" className="mo-btn" onClick={() => setAuto(true)}>Voltar ao automático</button>}
            <button type="button" className="mo-btn is-yellow" onClick={toca}>{tocando ? 'Pausar' : 'Percorrer de 3 a 12'}</button>
          </div>
        </div>
        <div className="po-stage" aria-live="polite">
          {g.ase.map((tot, i) => {
            const crew = g.asesCrew[i];
            const q1 = crew.filter((x) => x === 'h1').length, c2 = crew.length - q1;
            return (
              <div className={'po-veh' + veic('ase' + i)} key={'ase' + i}>
                <Icon id="i-ase-lg" className="po-ill" />
                <div className="po-veh-h"><span>{g.k === 2 ? `ASE ${i + 1}` : 'ASE'}</span><span className={'po-badge ' + (tot >= 5 ? 'ok' : 'warn')}>{tot >= 5 ? 'padrão' : 'exceção'}</span></div>
                <Capacetes crew={crew} chave={'ase' + i + 'h'} prev={prev} keys={keys} />
                <p className="po-cap">{`${tot} bombeiros: ${c2 === 1 ? '1 condutor' : c2 + ' QBMG-2 (1 conduz)'} e ${q1} operacionais`}</p>
              </div>
            );
          })}
          {g.ar > 0 && (
            <div className={'po-veh' + veic('ar')}>
              <Icon id="i-ar-lg" className="po-ill" />
              <div className="po-veh-h"><span>AR</span><span className={'po-badge ' + (g.arCond ? 'ok' : 'warn')}>{g.arCond ? 'emergência' : 'não emergencial'}</span></div>
              <Capacetes crew={g.arCrew} chave="arh" prev={prev} keys={keys} />
              <p className="po-cap">{g.arCond ? `${g.ar} ocupantes. Condutor: QBMG-2.` : `${g.ar} ocupantes. Condutor: QBMG-1. Só prevenção, lavagem de pista e captura de insetos.`}</p>
            </div>
          )}
          {g.reserva > 0 && (
            <div className={'po-veh is-reserva' + veic('res')}>
              <div className="po-veh-h"><span>{g.reserva === 1 ? '1 sem viatura' : `${g.reserva} sem viatura`}</span></div>
              <Capacetes crew={g.reservaCrew} chave="resh" prev={prev} keys={keys} />
              <p className="po-cap">{g.reserva === 1 ? 'Não completa outra guarnição. Fica de reserva.' : 'Não completam outra guarnição. Ficam de reserva.'}</p>
            </div>
          )}
          {!g.k && !g.ar && !g.reserva && (
            <div className={'po-veh is-vazio' + veic('vazio')}><p className="po-cap">Nenhuma viatura pode ser ativada.</p></div>
          )}
        </div>
        <ul className="po-msgs">{msgs.map(([cls, txt]) => <li key={txt} className={cls}>{txt}</li>)}</ul>
        <div className="po-key">
          <span><svg className="po-helm h2" aria-hidden="true"><use href="#i-helm" /></svg>Condutor (QBMG-2)</span>
          <span><svg className="po-helm h1" aria-hidden="true"><use href="#i-helm" /></svg>Operacional (QBMG-1)</span>
        </div>
      </Card>

      <Card id="po-regras">
        <div className="mo-card-head"><h2>Regras de guarnição</h2></div>
        <dl className="mo-crit">
          <div><dt><Icon id="i-ase" />ASE no padrão</dt><dd><b>5 bombeiros</b>: 1 condutor (QBMG-2) e 4 operacionais (QBMG-1).</dd></div>
          <div><dt><Icon id="i-ase" />ASE em exceção</dt><dd><b>4 bombeiros</b>: 1 condutor (QBMG-2) e 3 operacionais (QBMG-1). É o mínimo para o ASE.</dd></div>
          <div><dt><Icon id="i-ar" />Caminhonete AR</dt><dd><b>2 a 4 ocupantes</b>. Um QBMG-1 pode conduzir a AR só em deslocamento não emergencial: prevenção, lavagem de pista e captura de insetos.</dd></div>
          <div><dt><Icon id="i-ase" /><Icon id="i-ase" />Dois ASE</dt><dd>A partir de <b>8 bombeiros</b>. O ideal é <b>10</b>. Cada ASE precisa de 1 condutor (QBMG-2).</dd></div>
        </dl>
        <p className="mo-note">Ordem: 1 ASE. Com 6 ou 7, ASE e AR. Com 8 ou mais, 2º ASE. O resto completa os ASE e depois a AR. Um condutor pode ocupar a vaga de operacional. O adjunto de serviço e as escalas do intermediário (VCI, VS, VPA, VE) não entram nesta conta.</p>
      </Card>
    </div>
  );
}
