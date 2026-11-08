import { useEffect, useRef } from 'react';

/** Dica flutuante dos botões «i» e dos itens com data-tip (mouse, foco e toque). */
export function TipLayer() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const b = box.current!;
    let dono: Element | null = null;
    const mostra = (el: HTMLElement) => {
      dono = el;
      b.textContent = el.dataset.tip ?? '';
      b.hidden = false;
      el.setAttribute('aria-describedby', 'mo-tipbox');
      const r = el.getBoundingClientRect(), w = b.offsetWidth, h = b.offsetHeight;
      const left = Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2));
      let top = r.bottom + 8;
      if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
      b.style.left = left + 'px';
      b.style.top = top + 'px';
    };
    const esconde = () => { dono?.removeAttribute('aria-describedby'); dono = null; b.hidden = true; };
    const alvo = (ev: Event) => (ev.target instanceof Element ? (ev.target.closest('[data-tip]') as HTMLElement | null) : null);
    const over = (ev: MouseEvent) => { const el = alvo(ev); if (el && el !== dono) mostra(el); };
    const out = (ev: MouseEvent) => { const el = alvo(ev); if (el && !el.contains(ev.relatedTarget as Node | null)) esconde(); };
    const fin = (ev: FocusEvent) => { const el = alvo(ev); if (el) mostra(el); };
    const fout = (ev: FocusEvent) => { if (alvo(ev)) esconde(); };
    const click = (ev: MouseEvent) => {
      const el = ev.target instanceof Element ? ev.target.closest('.tip') : null;
      if (el) { ev.preventDefault(); ev.stopPropagation(); mostra(el as HTMLElement); return; }
      esconde();
    };
    const key = (ev: KeyboardEvent) => { if (ev.key === 'Escape') esconde(); };
    document.addEventListener('mouseover', over);
    document.addEventListener('mouseout', out);
    document.addEventListener('focusin', fin);
    document.addEventListener('focusout', fout);
    document.addEventListener('click', click, true);
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', esconde, true);
    return () => {
      document.removeEventListener('mouseover', over);
      document.removeEventListener('mouseout', out);
      document.removeEventListener('focusin', fin);
      document.removeEventListener('focusout', fout);
      document.removeEventListener('click', click, true);
      document.removeEventListener('keydown', key);
      window.removeEventListener('scroll', esconde, true);
    };
  }, []);

  return <div className="tipbox" role="tooltip" id="mo-tipbox" hidden ref={box} />;
}
