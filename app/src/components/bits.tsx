import type { CSSProperties, ReactNode } from 'react';
import { iconeDe, nomeViatura } from '../format';

/** Botão «i» que explica o dado. */
export const Tip = ({ children }: { children: string }) => (
  <button type="button" className="tip" aria-label="Origem dos dados" data-tip={children}>i</button>
);

export const Icon = ({ id, className = 'mo-ic' }: { id: string; className?: string }) => (
  <svg className={className} aria-hidden="true"><use href={`#${id}`} /></svg>
);

export const Card = ({ id, children, className = '', style }: { id?: string; children: ReactNode; className?: string; style?: CSSProperties }) => (
  <article className={('mo-card ' + className).trim()} id={id} style={style}>{children}</article>
);
export const CardHead = ({ title, tip, note }: { title: ReactNode; tip?: string; note?: ReactNode }) => (
  <div className="mo-card-head">
    <h2>{title}{tip && <> <Tip>{tip}</Tip></>}</h2>
    {note != null && <p className="mo-note">{note}</p>}
  </div>
);

export const Tabs = <T extends string>({ label, value, onChange, items }: { label: string; value: T; onChange: (v: T) => void; items: { k: T; nome: ReactNode }[] }) => (
  <div className="mo-tabs" role="group" aria-label={label}>
    {items.map((i) => (
      <button key={i.k} type="button" aria-pressed={i.k === value} onClick={() => onChange(i.k)}>{i.nome}</button>
    ))}
  </div>
);

export const Legend = ({ children }: { children: ReactNode }) => <div className="mo-legend">{children}</div>;

/** Aviso de erro de uma aba. As outras abas continuam funcionando. */
export const PageErr = ({ titulo, msg }: { titulo: string; msg?: string }) => (
  <div className="mo-pgerr"><span className="mo-status-dot" /><span><b>{titulo}</b> {msg}</span></div>
);

/** Chip de viatura: ícone no padrão do CBMDF e o modelo. */
export const VtChip = ({ m }: { m: string }) => (
  <span className="mo-vt f-cbm" data-tip={nomeViatura(m)}><Icon id={iconeDe(m)} />{m}</span>
);

export const Sign = ({ v, children }: { v: number | null | undefined; children: ReactNode }) => (
  <span className={typeof v === 'number' ? (v < 0 ? 'is-neg' : v > 0 ? 'is-pos' : '') : ''}>{children}</span>
);
