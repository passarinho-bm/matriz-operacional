/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardHead, PageErr, Tabs } from '../components/bits';
import { f1, fInt, fmt, fold, norm } from '../format';
import { useData } from '../data';
import { useUi } from '../ui';

const COR_COMAR: Record<string, string> = { I: '#1976d2', II: '#dd6b20', III: '#2e7d32', IV: '#7b4fb8' };
interface CamCfg { nome: string; desc?: string; z: number; on: boolean; ponto?: boolean; campos?: Record<string, string> }
const CAM_BASE: Record<string, CamCfg> = {
  previa_atuacao_dos_gbms_2025_gbms_area_atuaoshp: { nome: 'Áreas de atuação dos GBMs', desc: 'Prévia 2025. Uma área por GBM.', z: 430, on: true, campos: { COMAR: 'COMAR' } },
  grupamentos_cbmdf: { nome: 'Quartéis', desc: 'Localização de cada GBM.', z: 460, on: true, ponto: true, campos: { seg_sigla: 'Sigla', seg_unidad: 'Unidade', seg_atuali: 'Atualização do cadastro' } },
  isochrones_6_min_de_deslocamento: { nome: 'Isócronas de deslocamento', desc: 'Área que o quartel alcança de carro. O nome da camada diz 6 min; o atributo diz o tempo usado.', z: 420, on: false, campos: { AA_MINS: 'Tempo (min)', AA_MODE: 'Modo', TOTAL_POP: 'População na área', CENTER_LAT: 'Latitude do centro', CENTER_LON: 'Longitude do centro' } },
  voronoi_polygons: { nome: 'Polígonos de Voronoi', desc: 'Região mais próxima de cada quartel, em linha reta.', z: 410, on: false, campos: { seg_sigla: 'Sigla', seg_unidad: 'Unidade', seg_endere: 'Endereço', seg_telefo: 'Telefone', seg_ra: 'Nº da RA', seg_tipo_u: 'Tipo' } },
  regioes_administrativasshp: { nome: 'Regiões administrativas', desc: 'Limites das RAs do DF.', z: 400, on: false, campos: { ra_codigo: 'Código', ra_nome: 'Nome', st_area_sh: 'Área (km²)', ra_path: 'Monografia' } },
};
const OCULTOS = new Set(['fid', 'descrição', 'st_length_', 'ra_cira', 'seg_orgao', 'seg_ende_1', 'seg_end_ca', 'seg_cpr', 'seg_georef']);
const numGbm = (t: string) => { t = norm(t); if (/sierra/i.test(t)) return 'sierra'; const m = t.match(/(\d+)/); return m ? m[1] : null; };
const semComar = (c: string) => norm(c).replace(/^COMAR\s+/i, '');

export function Espacial() {
  const { matriz } = useData();
  const ui = useUi();
  const all = matriz?.data?.rows ?? [];
  const cont = useRef<HTMLDivElement>(null);
  const R = useRef<{ L: any; map: any; grupos: Record<string, any>; bases: Record<string, any>; comarPorNum: Record<string, string>; enquadrado: boolean; comarAp: string | null }>({ L: null, map: null, grupos: {}, bases: {}, comarPorNum: {}, enquadrado: false, comarAp: null });
  const [dados, setDados] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [on, setOn] = useState<Record<string, boolean>>({});
  const [base, setBase] = useState<'mapa' | 'satelite'>('mapa');
  const [semMapa, setSemMapa] = useState(false);
  const [cor, setCor] = useState<'arquivo' | 'comar'>('arquivo');
  const [lista, setLista] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [ver, setVer] = useState(0);
  const live = useRef({ ui, all, cor, on });
  live.current = { ui, all, cor, on };

  const cam = (id: string): CamCfg => CAM_BASE[id] ?? { nome: id, z: 405, on: false };
  const gbmDaMatriz = (sig: string) => {
    const k = numGbm(sig);
    if (!k) return null;
    return live.current.all.find((r) => (k === 'sierra' ? /sierra/i.test(r.gbm) : numGbm(r.gbm) === k)) || null;
  };
  const siglaDe = (cid: string, f: any) => { const a = f.properties.attrs || {}; return cid.startsWith('previa') ? f.properties.nome : a.seg_sigla || f.properties._gbm || null; };
  const comarDeFeat = (cid: string, f: any) => {
    if (cid.startsWith('regioes')) return null;
    const sig = siglaDe(cid, f);
    const k = sig ? numGbm(sig) : null;
    if (k && R.current.comarPorNum[k]) return R.current.comarPorNum[k];
    const g = sig ? gbmDaMatriz(sig) : null;
    return g ? g.comar : null;
  };
  const rotuloDe = (cid: string, f: any) => {
    const a = f.properties.attrs || {};
    if (cid.startsWith('previa')) return f.properties.nome || 'Área';
    if (cid.startsWith('grupa') || cid.startsWith('voronoi')) return a.seg_sigla || 'GBM';
    if (cid.startsWith('isochrones')) return 'Isócrona' + (f.properties._gbm ? ' · ' + f.properties._gbm : '');
    if (cid.startsWith('regioes')) return [a.ra_codigo, a.ra_nome].filter(Boolean).join(' · ') || 'RA';
    return f.properties.nome || 'Item';
  };
  const estiloDe = (cid: string, f: any) => {
    const e = f.properties.estilo || {};
    if (/Point/.test((f.geometry || {}).type || '')) return { radius: 6, color: '#fff', weight: 2, opacity: 1, fillColor: '#c8102e', fillOpacity: 1 };
    const st: any = { color: e.color || '#555', weight: Math.max(1, Math.min(4, e.weight || 1.5)), opacity: e.opacity ?? 1, fillColor: e.fillColor || e.color || '#555', fillOpacity: e.fillOpacity ?? 0.25 };
    if (cid.startsWith('previa') && live.current.cor === 'comar') {
      const c = COR_COMAR[comarDeFeat(cid, f) as string] || '#6b7280';
      Object.assign(st, { color: c, fillColor: c, fillOpacity: 0.3, weight: 1.5 });
    }
    if (cid.startsWith('regioes')) Object.assign(st, { weight: 2, fillOpacity: 0 });
    if (cid.startsWith('voronoi')) Object.assign(st, { weight: 1.5, dashArray: '4 3', fillOpacity: 0 });
    return st;
  };
  const popupDe = (cid: string, f: any) => {
    const d = cam(cid), a = f.properties.attrs || {};
    const box = document.createElement('div'); box.className = 'ge-pop';
    const t = document.createElement('p'); t.className = 'ge-pop-t'; t.textContent = rotuloDe(cid, f);
    const s2 = document.createElement('p'); s2.className = 'ge-pop-s'; s2.textContent = d.nome || cid;
    const dl = document.createElement('dl');
    const add = (k: string, v: string, link?: boolean) => {
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd');
      if (link && /^https:\/\//.test(v)) { const aa = document.createElement('a'); aa.href = v; aa.target = '_blank'; aa.rel = 'noopener'; aa.textContent = 'Abrir PDF'; dd.appendChild(aa); } else dd.textContent = v;
      dl.append(dt, dd);
    };
    const fmtCampo = (k: string, v: any) => {
      if (k === 'TOTAL_POP') return fmt('int', Number(v));
      if (k === 'st_area_sh') return f1(Number(v) / 1e6);
      if (k === 'CENTER_LAT' || k === 'CENTER_LON') return Number(v).toFixed(5).replace('.', ',');
      if (k === 'AA_MODE') return v === 'driving-car' ? 'carro' : String(v);
      return String(v);
    };
    if (cid.startsWith('isochrones') && f.properties._gbm) add('Quartel mais próximo do centro', f.properties._gbm);
    Object.entries(d.campos || {}).forEach(([k, lab]) => { if (a[k] != null && a[k] !== '') add(lab, fmtCampo(k, a[k]), k === 'ra_path'); });
    Object.entries(a).forEach(([k, v]) => { if (!(d.campos || {})[k] && !OCULTOS.has(k)) add(k, String(v)); });
    box.append(t, s2);
    if (dl.children.length) box.appendChild(dl);
    const sig = siglaDe(cid, f);
    const g = sig ? gbmDaMatriz(sig) : null;
    if (g) {
      const pm = document.createElement('p'); pm.className = 'ge-pop-m';
      const part = (lab: string, v: string) => { pm.append(document.createTextNode(lab + ': ')); const b = document.createElement('b'); b.textContent = v; pm.appendChild(b); pm.appendChild(document.createElement('br')); };
      pm.append(document.createTextNode('Na matriz (' + g.gbm + ')')); pm.appendChild(document.createElement('br'));
      part('Efetivo atual', fmt('int', g.efetivo_atual)); part('Saldo considerado', fmt('signed', g.saldo_considerado)); part('Matriz de risco', fmt('dec2', g.matriz_risco));
      const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = 'Abrir na Visão geral';
      bt.addEventListener('click', () => { live.current.ui.setGbm(g.gbm); live.current.ui.setPage('matriz'); window.scrollTo({ top: 0 }); });
      box.append(pm, bt);
    } else if (sig && (cid.startsWith('previa') || cid.startsWith('grupa'))) {
      const pm = document.createElement('p'); pm.className = 'ge-pop-m'; pm.textContent = 'Este GBM não está na aba Absoluto.'; box.appendChild(pm);
    }
    return box;
  };

  const enquadrar = () => {
    const { L, map, grupos } = R.current;
    if (!map) return;
    const b = L.latLngBounds([]);
    const ids = Object.keys(grupos).filter((id) => live.current.on[id] && grupos[id].getLayers().length);
    const semRa = ids.filter((id) => !id.startsWith('regioes'));
    (live.current.ui.comar !== 'Todos' && semRa.length ? semRa : ids).forEach((id) => b.extend(grupos[id].getBounds()));
    if (b.isValid()) map.fitBounds(b, { padding: [20, 20] });
  };

  // 1) Carrega o Leaflet só ao abrir a aba e monta o mapa.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [Lmod] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
        const L: any = (Lmod as any).default ?? Lmod;
        const res = await fetch('/api/mapa');
        if (!res.ok) throw new Error('O arquivo do mapa não carregou (código ' + res.status + ').');
        const d: any = await res.json();
        if (!vivo || !cont.current) return;
        const pts = (d.camadas.find((c: any) => c.id.startsWith('grupa')) || { features: [] }).features;
        d.camadas.filter((c: any) => c.id.startsWith('isochrones')).forEach((c: any) => c.features.forEach((f: any) => {
          const a = f.properties.attrs || {}, lon = Number(a.CENTER_LON), lat = Number(a.CENTER_LAT);
          let best: any = null, bd = Infinity;
          pts.forEach((p: any) => { const [x, y] = p.geometry.coordinates; const dd = (x - lon) ** 2 + (y - lat) ** 2; if (dd < bd) { bd = dd; best = p; } });
          if (best) f.properties._gbm = best.properties.attrs.seg_sigla;
        }));
        const cpn: Record<string, string> = {};
        d.camadas.filter((c: any) => c.id.startsWith('previa')).forEach((c: any) => c.features.forEach((f: any) => {
          const k = numGbm(f.properties.nome), cm = semComar((f.properties.attrs || {}).COMAR || '');
          if (k && cm) cpn[k] = cm;
        }));
        const map = L.map(cont.current, { zoomControl: true, preferCanvas: false, zoomSnap: 0.25, zoomDelta: 0.5 }).setView([-15.79, -47.88], 10);
        const bases = {
          mapa: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }),
          satelite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Imagens &copy; Esri' }),
        };
        // Se o OpenStreetMap não carregar, usa só a imagem de satélite.
        let okMapa = 0, erroMapa = 0, trocou = false;
        bases.mapa.on('tileload', () => { okMapa++; });
        bases.mapa.on('tileerror', () => {
          erroMapa++;
          if (okMapa || erroMapa < 4 || trocou) return;
          trocou = true; map.removeLayer(bases.mapa); bases.satelite.addTo(map);
          setSemMapa(true); setBase('satelite');
        });
        bases.mapa.addTo(map);
        L.control.scale({ imperial: false }).addTo(map);
        const ligadas: Record<string, boolean> = {};
        d.camadas.forEach((c: any) => {
          const cfg = CAM_BASE[c.id] ?? { z: 405, on: false };
          map.createPane('p_' + c.id).style.zIndex = String(cfg.z);
          ligadas[c.id] = !!cfg.on;
        });
        Object.assign(R.current, { L, map, bases, comarPorNum: cpn });
        setOn(ligadas);
        setLista((d.camadas.find((c: any) => c.id.startsWith('previa')) || d.camadas[0]).id);
        setDados(d);
      } catch (e) {
        if (vivo) setErro(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { vivo = false; R.current.map?.remove(); Object.assign(R.current, { map: null, grupos: {}, bases: {}, enquadrado: false, comarAp: null }); };
  }, []);

  // 2) Refaz as camadas quando muda o COMAR, a cor das áreas ou a matriz.
  useEffect(() => {
    const { L, map } = R.current;
    if (!map || !dados) return;
    Object.values(R.current.grupos).forEach((g: any) => map.removeLayer(g));
    R.current.grupos = {};
    dados.camadas.forEach((c: any) => {
      const d = cam(c.id);
      const g = L.geoJSON({ type: 'FeatureCollection', features: c.features }, {
        pane: 'p_' + c.id,
        filter: (f: any) => ui.comar === 'Todos' || c.id.startsWith('regioes') || comarDeFeat(c.id, f) === ui.comar,
        style: (f: any) => estiloDe(c.id, f),
        pointToLayer: (_f: any, ll: any) => L.circleMarker(ll, { pane: 'p_' + c.id, radius: 6, color: '#fff', weight: 2, fillColor: '#c8102e', fillOpacity: 1 }),
        onEachFeature: (f: any, lyr: any) => {
          lyr.bindPopup(() => popupDe(c.id, f), { maxWidth: 320 });
          lyr.bindTooltip(rotuloDe(c.id, f), d.ponto ? { direction: 'top', offset: [0, -6], className: 'ge-rotulo' } : { sticky: true, className: 'ge-rotulo' });
          if (!d.ponto) {
            lyr.on('mouseover', () => { const st = estiloDe(c.id, f); lyr.setStyle({ weight: st.weight + 2, fillOpacity: Math.min(0.6, (st.fillOpacity || 0) + 0.15) }); });
            lyr.on('mouseout', () => lyr.setStyle(estiloDe(c.id, f)));
          }
        },
      });
      R.current.grupos[c.id] = g;
      if (live.current.on[c.id]) g.addTo(map);
    });
    setVer((v) => v + 1);
    const mudou = R.current.comarAp !== ui.comar;
    R.current.comarAp = ui.comar;
    const primeira = !R.current.enquadrado;
    R.current.enquadrado = true;
    setTimeout(() => { map.invalidateSize(); if (primeira || mudou) enquadrar(); }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, ui.comar, cor, all]);

  // 3) Liga e desliga camadas.
  useEffect(() => {
    const { map, grupos } = R.current;
    if (!map) return;
    Object.keys(grupos).forEach((id) => { if (on[id]) grupos[id].addTo(map); else map.removeLayer(grupos[id]); });
  }, [on, ver]);

  // 4) Mapa base.
  useEffect(() => {
    const { map, bases } = R.current;
    if (!map || !dados) return;
    (Object.keys(bases) as ('mapa' | 'satelite')[]).forEach((k) => { if (k === base) bases[k].addTo(map); else map.removeLayer(bases[k]); });
  }, [base, dados]);

  const ordem = useMemo(() => (dados ? [...dados.camadas].sort((a: any, b: any) => cam(b.id).z - cam(a.id).z) : []), [dados]);
  const ligadas = Object.keys(on).filter((k) => on[k]);
  const sozinha = ligadas.length === 1 ? ligadas[0] : null;
  const contagem = (id: string, c: any) => (R.current.grupos[id] ? R.current.grupos[id].getLayers().length : c.features.length);
  const camSel = dados?.camadas.find((c: any) => c.id === lista);
  const itens = (() => {
    if (!camSel || !R.current.grupos[camSel.id]) return [];
    const q = fold(busca).trim();
    return R.current.grupos[camSel.id].getLayers()
      .map((l: any) => ({ l, f: l.feature, r: rotuloDe(camSel.id, l.feature) }))
      .filter((x: any) => !q || fold(x.r + ' ' + Object.values(x.f.properties.attrs || {}).join(' ')).includes(q))
      .sort((a: any, b: any) => a.r.localeCompare(b.r, 'pt-BR', { numeric: true }));
  })();
  void ver;

  const ligaTodas = () => { setOn(Object.fromEntries(Object.keys(on).map((k) => [k, true]))); live.current.on = Object.fromEntries(Object.keys(on).map((k) => [k, true])); setTimeout(enquadrar, 0); };
  const soEsta = (id: string) => {
    const n = Object.fromEntries(Object.keys(on).map((k) => [k, k === id]));
    live.current.on = n; setOn(n); setLista(id); setTimeout(enquadrar, 0);
  };
  const abreItem = (x: any) => {
    const { map } = R.current;
    if (!on[camSel.id]) setOn((o) => ({ ...o, [camSel.id]: true }));
    if (x.l.getBounds) map.fitBounds(x.l.getBounds(), { padding: [30, 30], maxZoom: 14 }); else map.setView(x.l.getLatLng(), 14);
    x.l.openPopup();
    const el = cont.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  return (
    <div className="mo-page">
      {erro && <PageErr titulo="O mapa não carregou." msg={erro} />}
      <p className="mo-lede">Camadas do arquivo <b>{dados ? String(dados.documento).replace(/^Cópia de\s*/i, '') : 'EMOPE – Plano de Emprego – Áreas de Atuação'}</b>. Ligue ou desligue cada camada. Selecione um item no mapa para ver os dados. <span>{dados?.descricao ? 'Aviso do arquivo: ' + dados.descricao : ''}</span></p>
      <div className="ge-wrap">
        <Card id="ge-painel">
          <CardHead title="Camadas" tip={`Fonte: arquivo KMZ «Cópia de EMOPE – Plano de Emprego – Areas de Atuação».
O filtro de COMAR vale para as camadas ligadas a um GBM. As regiões administrativas não têm COMAR.`} note="Marque para mostrar. «Só esta» isola a camada." />
          <ul className="ge-camadas">
            {ordem.map((c: any) => {
              const d = cam(c.id);
              const f0 = c.features.find((f: any) => f.properties.estilo && (f.properties.estilo.color || f.properties.estilo.fillColor));
              const corSw = (f0 && (f0.properties.estilo.color || f0.properties.estilo.fillColor)) || '#6b7280';
              return (
                <li className="ge-cam" key={c.id}>
                  <input type="checkbox" id={'ge-cb-' + c.id} checked={!!on[c.id]} onChange={(e) => setOn((o) => ({ ...o, [c.id]: e.target.checked }))} />
                  <i className={'ge-sw' + (d.ponto ? ' is-ponto' : '')} style={!d.ponto ? { ['--c' as string]: corSw } : undefined} />
                  <label htmlFor={'ge-cb-' + c.id}>{d.nome} <span>({fInt(contagem(c.id, c))})</span></label>
                  <button type="button" className="ge-so" aria-pressed={sozinha === c.id} onClick={() => soEsta(c.id)}>Só esta</button>
                  <p className="ge-desc">{d.desc || c.nomeOriginal}</p>
                </li>
              );
            })}
          </ul>
          <div className="ge-acoes"><button type="button" className="mo-btn" onClick={ligaTodas}>Mostrar todas</button><button type="button" className="mo-btn" onClick={enquadrar}>Enquadrar</button></div>
          <div className="ge-bloco">
            <p>Cor das áreas de atuação</p>
            <Tabs<'arquivo' | 'comar'> label="Cor das áreas de atuação" value={cor} onChange={setCor} items={[{ k: 'arquivo', nome: 'Cores do arquivo' }, { k: 'comar', nome: 'Por COMAR' }]} />
          </div>
          <div className="ge-bloco">
            <p>Mapa base</p>
            <div className="mo-tabs" role="group" aria-label="Mapa base">
              {!semMapa && <button type="button" aria-pressed={base === 'mapa'} onClick={() => setBase('mapa')}>Mapa</button>}
              <button type="button" aria-pressed={base === 'satelite'} onClick={() => setBase('satelite')}>Satélite</button>
            </div>
          </div>
          <div className="ge-bloco">
            <p>Itens da camada</p>
            <select className="mo-search" aria-label="Camada da lista" value={lista ?? ''} onChange={(e) => setLista(e.target.value)}>
              {ordem.map((c: any) => <option key={c.id} value={c.id}>{cam(c.id).nome}</option>)}
            </select>
            <input className="mo-search" type="search" placeholder="Buscar item" aria-label="Buscar item da camada" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <ul className="ge-itens">
              {itens.map((x: any, i: number) => <li key={x.r + i}><button type="button" onClick={() => abreItem(x)}>{x.r}</button></li>)}
            </ul>
          </div>
        </Card>
        <Card className="ge-mapa-card"><div className="ge-mapa" ref={cont} role="region" aria-label="Mapa das camadas" /></Card>
      </div>
    </div>
  );
}
