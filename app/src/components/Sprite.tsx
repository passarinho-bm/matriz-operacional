import { SPRITE } from '../sprite';

export const Sprite = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: SPRITE }} />
);
