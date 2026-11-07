import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const aqui = dirname(fileURLToPath(import.meta.url));
process.env.SHEET_LOCAL_DIR = join(aqui, 'fixtures');
const { GoogleSheetDataSource } = require('../dist/server/matriz/google-sheet.data-source.js');
const { MatrizService } = require('../dist/server/matriz/matriz.service.js');
const { resumo, frota } = require('../dist/server/matriz/calculo.js');
const { csvParseRows, numBR, chave } = require('../dist/server/matriz/sheet/util.js');
const { parseAbsoluto } = require('../dist/server/matriz/sheet/absoluto.js');

const fonte = new GoogleSheetDataSource();

test('CSV: aspas, vírgula e quebra de linha dentro do campo', () => {
  const g = csvParseRows('a,"b,c","d\n""e"""\n1,2,3');
  assert.deepEqual(g, [['a', 'b,c', 'd\n"e"'], ['1', '2', '3']]);
});

test('número brasileiro', () => {
  assert.equal(numBR('1.234,5'), 1234.5);
  assert.equal(numBR('+3'), 3);
  assert.equal(numBR('−2,5'), -2.5);
  assert.equal(numBR('3º'), 3);
  assert.equal(numBR('R$ 1.500,00'), 1500);
  assert.equal(numBR(''), null);
});

test('cabeçalho normalizado ignora acento, caixa e espaços', () => {
  assert.equal(chave('  Efetivo  Necessário (com 30% de afast.) '), chave('efetivo necessario com 30 de afast'));
});

test('Absoluto: lê 24 GBMs e tira o ícone das viaturas', async () => {
  const rows = await fonte.lerAbsoluto();
  assert.equal(rows.length, 24);
  assert.equal(rows[0].gbm, '1º GBM/Asa Sul');
  assert.equal(rows[0].ur, 'UR 2023');
  assert.equal(typeof rows[0].efetivo_atual, 'number');
});

test('Absoluto: aceita colunas em outra ordem', async () => {
  const { readFileSync } = await import('node:fs');
  const grid = csvParseRows(readFileSync(join(aqui, 'fixtures/t-absoluto.csv'), 'utf8'));
  const hi = grid.findIndex((r) => r.includes('GBM'));
  const inv = grid.map((r, i) => (i >= hi ? [...r].reverse() : r));
  const rows = parseAbsoluto(inv);
  const ref = await fonte.lerAbsoluto();
  assert.equal(rows.length, ref.length);
  assert.equal(rows[3].efetivo_atual, ref[3].efetivo_atual);
  assert.equal(rows[3].gbm, ref[3].gbm);
});

test('Absoluto: coluna faltando gera erro claro', () => {
  const grid = [['GBM', 'COMAR', 'UR'], ['1º GBM', 'I', 'UR']];
  assert.throws(() => parseAbsoluto(grid), /Colunas não encontradas/);
});

test('Risco, carga e parâmetros', async () => {
  const risco = await fonte.lerRisco();
  assert.equal(risco.length, 24);
  assert.ok(risco.every((r) => r.total != null));
  const carga = await fonte.lerCarga();
  assert.equal(carga.rows.length, 24);
  assert.ok(carga.total && carga.total.oc > 0);
  assert.ok(carga.rows[0].aph && carga.rows[0].multi && carga.rows[0].inc);
  const p = await fonte.lerParametros();
  assert.equal(p.classes.length, 6);
  assert.equal(p.pesos.dop, 2);
  assert.equal(p.cotaFator, 2.5);
  assert.equal(p.ofBase, 4);
  assert.equal(p.ofPct, 0.3);
  assert.equal(p.dist.rows.length, 24);
  assert.equal(p.tempo.cols.length, 24);
});

test('Resumo: soma e conta déficits por COMAR', async () => {
  const rows = await fonte.lerAbsoluto();
  const r = resumo(rows);
  assert.deepEqual(r.map((x) => x.comar), ['Todos', 'I', 'II', 'III', 'IV']);
  const todos = r[0];
  assert.equal(todos.gbms, 24);
  assert.equal(todos.efetivo_atual, rows.reduce((s, x) => s + x.efetivo_atual, 0));
  assert.equal(todos.efetivo_atual, r.slice(1).reduce((s, x) => s + x.efetivo_atual, 0));
  assert.equal(todos.gbms_deficit_efetivo, rows.filter((x) => x.saldo_efetivo < 0).length);
  assert.equal(todos.viaturas, todos.viaturas_base + todos.viaturas_intermediario);
  const pior = rows.reduce((a, x) => (x.saldo_carga < a.saldo_carga ? x : a));
  assert.equal(todos.pior_gbm_carga, pior.gbm);
});

test('Frota: conta viaturas por posição', async () => {
  const rows = await fonte.lerAbsoluto();
  const f = frota(rows).filter((x) => x.comar === 'Todos');
  assert.equal(f.length, 10);
  const ur = f.find((x) => x.categoria === 'ur');
  assert.equal(ur.qtd, 24);
  assert.match(ur.modelos, /UR 2023 24/);
});

test('Serviço: cada aba falha sozinha e o cache cobre a falha', async () => {
  let falha = false;
  const fake = {
    nome: 'teste',
    lerAbsoluto: () => fonte.lerAbsoluto(),
    lerRisco: async () => { if (falha) throw new Error('queda'); return fonte.lerRisco(); },
    lerCarga: async () => { throw new Error('carga fora'); },
    lerParametros: () => fonte.lerParametros(),
  };
  process.env.SHEET_CACHE_SECONDS = '0';
  const svc = new MatrizService(fake);
  assert.equal((await svc.matriz()).status, 'ok');
  const car = await svc.carga();
  assert.equal(car.status, 'error');
  assert.match(car.msg, /carga fora/);
  assert.equal((await svc.risco()).obsoleto, false);
  falha = true;
  const ris = await svc.risco();
  assert.equal(ris.status, 'ok');
  assert.equal(ris.obsoleto, true);
  const st = await svc.status();
  assert.equal(st.abas.find((a) => a.aba === 'carga').status, 'error');
  assert.equal(st.abas.find((a) => a.aba === 'absoluto').status, 'ok');
});
