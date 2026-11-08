import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { divisao, guarnicao, condutoresAuto, resumoGuarnicao } = require('../dist/shared/poder.js');

test('GBM de 69 = 6 + 5 + 15 + 43 nas 4 alas', () => {
  const d = divisao(69);
  assert.equal(d.expediente, 6);
  assert.equal(d.secom, 5);
  assert.equal(d.escalaUr, 15);
  assert.equal(d.resto, 43);
  assert.deepEqual(d.alas.map((a) => a.n), [11, 11, 11, 10]);
  assert.equal(d.alas.reduce((s, a) => s + a.n, 0), 43);
});

test('ASE: 4 é exceção, 5 é padrão', () => {
  const g4 = guarnicao(4, 1);
  assert.deepEqual(g4.ase, [4]);
  assert.equal(resumoGuarnicao(g4), 'ASE em exceção');
  const g5 = guarnicao(5, 1);
  assert.deepEqual(g5.ase, [5]);
  assert.equal(resumoGuarnicao(g5), 'ASE no padrão');
});

test('AR tem de 2 a 4 ocupantes', () => {
  for (let n = 2; n <= 14; n++) {
    const g = guarnicao(n, condutoresAuto(n));
    if (g.ar) assert.ok(g.ar >= 2 && g.ar <= 4, `n=${n}`);
  }
});

test('dois ASE a partir de 8, ideal 10', () => {
  assert.equal(guarnicao(7, 2).k, 1);
  assert.equal(guarnicao(8, 2).k, 2);
  const g10 = guarnicao(10, 2);
  assert.deepEqual(g10.ase, [5, 5]);
  assert.equal(resumoGuarnicao(g10), '2 ASE no padrão');
});

test('AR só é conduzida por QBMG-1 fora de emergência', () => {
  const g = guarnicao(6, 1);
  assert.ok(g.ar > 0);
  assert.equal(g.arCond, false);
  assert.equal(guarnicao(6, 2).arCond, true);
});

test('cada ASE precisa de 1 condutor (QBMG-2)', () => {
  const g = guarnicao(12, 2);
  g.asesCrew.forEach((crew) => assert.equal(crew[0], 'h2'));
  assert.equal(guarnicao(10, 1).k, 1);
  assert.equal(guarnicao(10, 1).falta2Cond, true);
});
