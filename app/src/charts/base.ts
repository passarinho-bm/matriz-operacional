import * as d3 from 'd3';

export type Sel = d3.Selection<any, any, any, any>;
export interface TipLine { t: string; cls?: string; sw?: string }

export const makeSvg = (el: HTMLElement, W: number, H: number, label: string) => {
  const svg = d3.create('svg').attr('class', 'mo-svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', label);
  el.replaceChildren(svg.node() as Node);
  return svg;
};

/** Largura do maior texto, medida no próprio SVG (já na fonte do tema). */
export const measure = (svg: Sel, texts: string[], cls?: string): number => {
  const g = svg.append('g');
  let w = 0;
  texts.forEach((t) => { const n = g.append('text').attr('class', cls || null).text(t).node() as SVGTextElement; w = Math.max(w, n.getComputedTextLength()); });
  g.remove();
  return Math.ceil(w);
};

export interface Tip { show: (lines: TipLine[], x: number, y: number) => void; hide: () => void }
export const tipFor = (el: HTMLElement): Tip => {
  const t = document.createElement('div');
  t.className = 'mo-tip';
  t.hidden = true;
  el.appendChild(t);
  return {
    show(lines, x, y) {
      t.replaceChildren(...lines.map((ln) => {
        const d = document.createElement('div');
        if (ln.cls) d.className = ln.cls;
        if (ln.sw) { const s = document.createElement('span'); s.className = 'mo-tip-sw'; s.style.background = `var(${ln.sw})`; d.appendChild(s); }
        d.appendChild(document.createTextNode(ln.t));
        return d;
      }));
      t.hidden = false;
      const w = t.offsetWidth, h = t.offsetHeight, W = el.clientWidth;
      let left = x + 14;
      if (left + w > W) left = x - w - 14;
      if (left < 0) left = Math.max(0, Math.min(W - w, x - w / 2));
      let top = y - h - 10;
      if (top < 0) top = y + 14;
      t.style.left = left + 'px';
      t.style.top = top + 'px';
    },
    hide() { t.hidden = true; },
  };
};

/** Linhas clicáveis (mouse e teclado) com dica flutuante. */
export const rowEvents = (sel: Sel, el: HTMLElement, tip: Tip, lines: (d: any) => TipLine[], onPick: (gbm: string) => void) => {
  sel.attr('tabindex', 0).attr('role', 'button')
    .on('click', (_ev: Event, d: any) => onPick(d.gbm))
    .on('keydown', (ev: KeyboardEvent, d: any) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onPick(d.gbm); } })
    .on('mousemove', (ev: MouseEvent, d: any) => { const [px, py] = d3.pointer(ev, el); tip.show(lines(d), px, py); })
    .on('mouseleave blur', () => tip.hide());
};
