import { useLayoutEffect, useRef, type DependencyList } from 'react';

/** Hospeda um gráfico D3: desenha de novo quando os dados ou a largura mudam. */
export function D3Chart({ id, className = 'mo-chart', draw, deps, style }: {
  id?: string; className?: string; draw: (el: HTMLElement) => void; deps: DependencyList; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fn = useRef(draw);
  fn.current = draw;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    fn.current(el);
    let largura = el.clientWidth;
    let t: number | undefined;
    const ro = new ResizeObserver(() => {
      if (Math.round(el.clientWidth) === Math.round(largura)) return;
      largura = el.clientWidth;
      window.clearTimeout(t);
      t = window.setTimeout(() => fn.current(el), 120);
    });
    ro.observe(el);
    return () => { ro.disconnect(); window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return <div id={id} className={className} ref={ref} style={style} />;
}
