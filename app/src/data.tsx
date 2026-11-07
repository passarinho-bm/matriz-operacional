import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CargaData, Envelope, MatrizPayload, Params, RiscoRow, StatusPayload } from '@shared/types';

export interface DataState {
  carregando: boolean;
  matriz: Envelope<MatrizPayload> | null;
  risco: Envelope<RiscoRow[]> | null;
  carga: Envelope<CargaData> | null;
  params: Envelope<Params> | null;
  status: StatusPayload | null;
  recarregar: () => Promise<void>;
}

const Ctx = createContext<DataState | null>(null);

async function pega<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`A API respondeu com o código ${r.status}.`);
  return r.json() as Promise<T>;
}
const falha = <T,>(e: unknown): Envelope<T> => ({
  status: 'error', msg: e instanceof Error ? e.message : String(e), atualizadoEm: null, obsoleto: false, data: null,
});

export function DataProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Omit<DataState, 'recarregar'>>({ carregando: true, matriz: null, risco: null, carga: null, params: null, status: null });

  const carrega = useCallback(async (forcar: boolean) => {
    setS((o) => ({ ...o, carregando: true }));
    if (forcar) { try { await pega('/api/recarregar', { method: 'POST' }); } catch { /* a leitura abaixo mostra o erro */ } }
    const [m, r, c, p, st] = await Promise.allSettled([
      pega<Envelope<MatrizPayload>>('/api/matriz'), pega<Envelope<RiscoRow[]>>('/api/risco'), pega<Envelope<CargaData>>('/api/carga'),
      pega<Envelope<Params>>('/api/parametros'), pega<StatusPayload>('/api/status'),
    ]);
    const v = <T,>(x: PromiseSettledResult<Envelope<T>>) => (x.status === 'fulfilled' ? x.value : falha<T>(x.reason));
    setS({ carregando: false, matriz: v(m), risco: v(r), carga: v(c), params: v(p), status: st.status === 'fulfilled' ? st.value : null });
  }, []);

  useEffect(() => { void carrega(false); }, [carrega]);
  const value = useMemo<DataState>(() => ({ ...s, recarregar: () => carrega(true) }), [s, carrega]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData fora do DataProvider');
  return v;
}
