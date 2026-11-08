import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { COMARS, NATS, natOf } from './format';

export type Pagina = 'tabela' | 'matriz' | 'natureza' | 'risco' | 'carga' | 'distancias' | 'espacial' | 'poder';
export type MedidaSaldo = 'saldo_efetivo' | 'saldo_considerado' | 'saldo_carga';

export const PAGINAS: { k: Pagina; nome: string }[] = [
  { k: 'tabela', nome: 'Matriz' }, { k: 'matriz', nome: 'Visão geral' }, { k: 'natureza', nome: 'Ranking por natureza' },
  { k: 'risco', nome: 'Matriz de risco' }, { k: 'carga', nome: 'Carga operacional' }, { k: 'distancias', nome: 'Distâncias' },
  { k: 'espacial', nome: 'Visão espacial' }, { k: 'poder', nome: 'Poder operacional' },
];

interface UiState { page: Pagina; comar: string; nat: string; saldo: MedidaSaldo; gbm: string | null }
interface Ui extends UiState {
  setPage: (p: Pagina) => void;
  setComar: (c: string) => void;
  setNat: (n: string) => void;
  setSaldo: (s: MedidaSaldo) => void;
  setGbm: (g: string) => void;
  /** Seleciona o GBM e rola até a ficha, se ela estiver fora da tela. */
  pick: (g: string, idAlvo?: string) => void;
}

const Ctx = createContext<Ui | null>(null);

/** #matriz (padrão) · #geral · #risco-II · #espacial-III · #natureza · #florestal */
function leHash(base: UiState): UiState {
  const s = { ...base, page: 'tabela' as Pagina };
  decodeURIComponent(location.hash.slice(1)).split('-').filter(Boolean).forEach((t) => {
    if ((COMARS as readonly string[]).includes(t)) s.comar = t;
    else if (t === 'geral') s.page = 'matriz';
    else if (t === 'matriz') s.page = 'tabela';
    else if (['natureza', 'tabela', 'risco', 'carga', 'distancias', 'espacial', 'poder'].includes(t)) s.page = t as Pagina;
    else { const n = NATS.find((o) => o.slug === t); if (n) { s.nat = n.k; s.page = 'natureza'; } }
  });
  return s;
}
function escreveHash(s: UiState) {
  const p: string[] = [];
  if (s.page === 'natureza') p.push(s.nat === NATS[0].k ? 'natureza' : natOf(s.nat).slug);
  else if (s.page === 'matriz') p.push('geral');
  else if (s.page !== 'tabela') p.push(s.page);
  if (s.comar !== 'Todos') p.push(s.comar);
  history.replaceState(null, '', p.length ? '#' + p.join('-') : location.pathname + location.search);
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<UiState>(() => leHash({ page: 'tabela', comar: 'Todos', nat: NATS[0].k, saldo: 'saldo_considerado', gbm: null }));

  useEffect(() => {
    const f = () => setS((o) => leHash(o));
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);

  const muda = useCallback((p: Partial<UiState>) => setS((o) => { const n = { ...o, ...p }; escreveHash(n); return n; }), []);
  const value = useMemo<Ui>(() => ({
    ...s,
    setPage: (page) => muda({ page }),
    setComar: (comar) => muda({ comar }),
    setNat: (nat) => muda({ nat }),
    setSaldo: (saldo) => setS((o) => ({ ...o, saldo })),
    setGbm: (gbm) => setS((o) => ({ ...o, gbm })),
    pick: (gbm, idAlvo = 'ficha') => {
      setS((o) => ({ ...o, gbm }));
      requestAnimationFrame(() => {
        const f = document.getElementById(idAlvo);
        if (f && f.getBoundingClientRect().top < 0) f.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    },
  }), [s, muda]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUi(): Ui {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUi fora do UiProvider');
  return v;
}
