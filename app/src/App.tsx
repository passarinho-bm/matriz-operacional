import { Suspense, lazy, type ReactNode } from 'react';
import { Sprite } from './components/Sprite';
import { TipLayer } from './components/TipLayer';
import { DataProvider, useData } from './data';
import { Carga } from './pages/Carga';
import { Distancias } from './pages/Distancias';
import { Matriz } from './pages/Matriz';
import { Natureza } from './pages/Natureza';
import { Poder } from './pages/Poder';
import { Risco } from './pages/Risco';
import { VisaoGeral } from './pages/VisaoGeral';
import { COMARS } from './format';
import { APP_VERSION } from './version';
import { PAGINAS, UiProvider, useUi, type Pagina } from './ui';

// O Leaflet só carrega ao abrir a aba Visão espacial.
const Espacial = lazy(() => import('./pages/Espacial').then((m) => ({ default: m.Espacial })));

const dataHora = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');

const Status = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <div className="mo-status"><span className="mo-status-dot" /><span><b>{titulo}</b> {children}</span></div>
);

function Shell() {
  const { matriz, carregando, status, recarregar } = useData();
  const ui = useUi();
  const hoje = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const periodo = hoje.charAt(0).toUpperCase() + hoje.slice(1);
  const atual = PAGINAS.find((p) => p.k === ui.page)!;
  const erroMatriz = matriz?.status === 'error';

  const pagina: Record<Pagina, ReactNode> = {
    tabela: <Matriz />, matriz: <VisaoGeral />, natureza: <Natureza />, risco: <Risco />, carga: <Carga />, distancias: <Distancias />,
    espacial: <Suspense fallback={<p className="mo-lede">Carregando o mapa…</p>}><Espacial /></Suspense>, poder: <Poder />,
  };
  // As abas que dependem só do mapa ou de regras fixas funcionam mesmo sem a aba Absoluto.
  const semAbsoluto = ui.page === 'poder' || ui.page === 'espacial';

  return (
    <>
      <Sprite />
      <TipLayer />
      <header className="appbar">
        <div className="appbar-in">
          <span className="appbar-logo"><b>M</b>ATRIZ OPERACIONAL</span>
          <span className="appbar-sub">CBMDF · COMANDO OPERACIONAL</span>
        </div>
      </header>
      <div className={'mo' + (carregando ? ' is-loading' : '')} id="mo">
        <header className="mo-head" id="topo">
          <h1 className="sr">Matriz Operacional — {periodo.toLowerCase()}</h1>
          <nav className="crumbs" aria-label="Local">
            <svg viewBox="0 0 24 20" aria-hidden="true"><path d="M12 1 1 10h3v9h6v-6h4v6h6v-9h3z" /></svg>
            <span className="sep">›</span><span>Matriz Operacional</span><span className="sep">›</span><span>{periodo}</span><span className="sep">›</span><b>{atual.nome}</b>
          </nav>
          {ui.page !== 'poder' && (
            <div className="filtro">
              <span className="filtro-k">COMAR:</span>
              <div className="mo-seg" role="group" aria-label="Filtrar por COMAR">
                {COMARS.map((c) => <button key={c} type="button" aria-pressed={ui.comar === c} onClick={() => ui.setComar(c)}>{c}</button>)}
              </div>
            </div>
          )}
          <nav className="mo-pages" role="tablist" aria-label="Páginas">
            {PAGINAS.map((p) => <button key={p.k} type="button" role="tab" aria-selected={p.k === ui.page} onClick={() => ui.setPage(p.k)}>{p.nome}</button>)}
          </nav>
        </header>

        {erroMatriz && !semAbsoluto && (
          <Status titulo="A planilha não carregou.">{matriz?.msg}</Status>
        )}
        {matriz?.obsoleto && (
          <Status titulo={`Dados de ${dataHora(matriz.atualizadoEm)}.`}>Não foi possível atualizar.</Status>
        )}

        {erroMatriz && !semAbsoluto && ui.page !== 'distancias' && ui.page !== 'risco' && ui.page !== 'carga' ? null : pagina[ui.page]}

        <footer className="mo-foot">
          <span>
            Fonte: planilha Matriz Operacional, abas Absoluto, Matriz de Risco, Carga Operacional e Parâmetros.{' '}
            <span data-tip="A planilha publicada pode demorar alguns minutos para refletir as mudanças. A API guarda a leitura por alguns minutos.">
              {status?.atualizadoEm ? `Leitura: ${dataHora(status.atualizadoEm)}.` : ''}
            </span>{' '}
            <span>Versão {APP_VERSION}.</span>
          </span>
          <button type="button" className="mo-btn is-primary" onClick={() => void recarregar()}>Recarregar dados</button>
        </footer>
      </div>
    </>
  );
}

export function App() {
  return (
    <DataProvider>
      <UiProvider>
        <Shell />
      </UiProvider>
    </DataProvider>
  );
}
