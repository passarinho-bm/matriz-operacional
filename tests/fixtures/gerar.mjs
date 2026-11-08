// Gera dados FICTÍCIOS (não são dados do CBMDF) no formato das 4 abas da planilha.
// Uso: node tests/fixtures/gerar.mjs  →  grava t-absoluto.csv, t-risco.csv, t-carga.csv, t-params.csv aqui.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const br = (x, d = 2) => x.toFixed(d).replace('.', ',');
const sg = (x) => { const t = String(Math.abs(x)).replace('.', ','); return x > 0 ? '+' + t : x < 0 ? '\u2212' + t : '0'; };
const csv = (rows) => rows.map((r) => r.map((c) => { const s = String(c ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n') + '\n';

const NOMES = ['Asa Sul', 'Asa Norte', 'Taguatinga', 'Ceilândia', 'Gama', 'Sobradinho', 'Planaltina', 'Brazlândia', 'Santa Maria', 'São Sebastião', 'Paranoá', 'Samambaia',
  'Guará', 'Cruzeiro', 'Núcleo Bandeirante', 'Recanto das Emas', 'Riacho Fundo', 'Lago Sul', 'Lago Norte', 'Vicente Pires', 'Águas Claras', 'Sudoeste', 'Itapoã', 'Jardim Botânico'];
const gbms = NOMES.map((n, i) => ({ n: `${i + 1}º GBM/${n}`, comar: ['I', 'II', 'III', 'IV'][i % 4], i }));
const MOD = ['ASE 2024', 'ASE 2019', 'ABT 2020', 'ABSL 2022', 'AR 2023'];

const dados = gbms.map((g) => {
  const v = (p) => (rnd() < p ? MOD[ri(0, MOD.length - 1)] : '');
  const efAtual = ri(60, 110);
  const nec = ri(62, 100);
  const oc = ri(3000, 14000);
  const cotas = ri(0, 4);
  const saldo = efAtual - nec;
  const consid = Math.round((saldo + 5.2 + 2.5 * cotas) * 10) / 10;
  return { ...g, ur: 'UR 2023', ur_gsv: v(0.3), vme: v(0.5), vme2: v(0.2), apoio_ar: v(0.1), vci: v(0.2), vs: v(0.2), vpa: v(0.15), ve: v(0.1), apoio: v(0.2),
    nec, efAtual, saldo, od: rnd() < 0.7 ? 'Sim' : '', cotas, consid, oc, risco: rnd() * 40 + 20 };
});
const totOc = dados.reduce((s, d) => s + d.oc, 0), totEf = dados.reduce((s, d) => s + d.efAtual, 0);
const ralvo = totOc / totEf;
dados.forEach((d) => { d.coef = d.oc / d.efAtual / ralvo; d.novo = Math.max(69, Math.round(d.oc / ralvo)); d.saldoCarga = d.efAtual - d.novo; d.cargaAtual = d.oc / d.efAtual; d.cargaAtualizada = d.oc / (d.nec + 5.2 + 2.5 * d.cotas); });
const rank = (key, desc = true) => { const s = [...dados].sort((a, b) => (desc ? b[key] - a[key] : a[key] - b[key])); dados.forEach((d) => { d['rk_' + key] = s.indexOf(d) + 1; }); };
rank('oc'); dados.forEach((d) => { d.nUr = ri(100, 900); d.nMulti = ri(100, 700); d.nFlor = d.nMulti + ri(0, 80); d.nInc = ri(20, 300); });
['nUr', 'nMulti', 'nFlor', 'nInc'].forEach((k) => rank(k));
const rkRisco = [...dados].sort((a, b) => b.risco - a.risco);
dados.forEach((d) => { d.posRisco = rkRisco.indexOf(d) + 1; });

// ---- Absoluto
const hAbs = ['#', 'GBM', 'COMAR', 'UR', 'UR (GSV) / Reforço', 'VME', '2ª VME', 'Apoio AR', 'VCI', 'VS', 'VPA', 'VE', 'Apoio', 'Efetivo Necessário (com 30% de afast.)', 'Efetivo Atual', 'Saldo Efetivo',
  'Oficial de Dia', 'Cotas diárias de GSV 12h', 'Saldo Considerado', 'Relação Alvo (Ralvo)', 'Coeficiente de Ajuste', 'Novo Efetivo Necessário', 'Saldo Efetivo pelo Índice de Carga Operacional', 'Matriz de Risco',
  'Carga Operacional com Efetivo Atual', 'Carga Operacional - Atualizada', 'Ranking Ocorrências', 'Ranking UR', 'Ranking Multiemprego', 'Ranking Multiemprego c/ florestal', 'Ranking Incêndio estrutural'];
const ic = (m) => (m ? '🚒 ' + m : '');
const abs = [['Matriz Operacional (dados fictícios)'], [], hAbs, ...dados.map((d) => [d.i + 1, d.n, d.comar, ic(d.ur), ic(d.ur_gsv), ic(d.vme), ic(d.vme2), ic(d.apoio_ar), ic(d.vci), ic(d.vs), ic(d.vpa), ic(d.ve), ic(d.apoio),
  d.nec, d.efAtual, sg(d.saldo), d.od, d.cotas, sg(d.consid), br(ralvo), br(d.coef), d.novo, sg(d.saldoCarga), br(d.risco), br(d.cargaAtual), br(d.cargaAtualizada),
  d.rk_oc + 'º', d.rk_nUr + 'º', d.rk_nMulti + 'º', d.rk_nFlor + 'º', d.rk_nInc + 'º'])];
abs.push(['', 'TOTAL']);
writeFileSync(join(dir, 't-absoluto.csv'), csv(abs));

// ---- Risco
const hRis = ['COMAR', 'GBM', '≤2 atend.', '3 atend.', '4+ atend.', 'Coeficiente DOP', 'Pontos DOP', 'GBM de apoio', 'Distância (km)', 'Tempo de chegada: min', 'Tempo de chegada: s', 'Tempo de apoio (s)', 'Pontos isolamento',
  'População atendida', 'Renda per capita (R$)', 'Coeficiente PDO', 'Pontos PDO', 'Extensão da área (ha)', 'Edificações elevadas (> 12 m)', 'Risco da área (1 a 5)', 'Pontos: extensão', 'Pontos: edificações', 'Pontos: risco',
  'Pontos (fator D)', 'Pontuação total (ponderada)', 'Posição final (com empates)', 'Posição no trabalho (Tabela 5)'];
// «Pontos DOP» etc. vêm logo depois do coeficiente/tempo de apoio, como no parser (coluna seguinte).
const pts = () => ri(1, 6);
const ris = dados.map((d) => {
  const viz = gbms[(d.i + 1) % 24];
  const q2 = ri(2000, 9000), q3 = ri(200, 900), q4 = ri(10, 90);
  const dop = (q2 * 1 + q3 * 6.1 + q4 * 29.4) / 1000;
  const tm = ri(3, 28), ts = ri(0, 59);
  const pop = ri(80000, 600000), renda = ri(1500, 9000);
  const p = [pts(), pts(), pts()], fd = (pts() + pts() + 2 * pts()) / 4;
  const total = 2 * p[0] + p[1] + p[2] + fd;
  return { d, row: [d.comar, d.n, q2, q3, q4, br(dop), p[0], viz.n, br(tm * 0.9, 1), tm, ts, tm * 60 + ts, p[1], pop, br(renda), br(pop / renda), p[2], ri(500, 9000), ri(0, 40), ri(1, 5), pts(), pts(), pts(), br(fd), br(total), d.posRisco, d.posRisco], total };
});
writeFileSync(join(dir, 't-risco.csv'), csv([['Matriz de risco (dados fictícios)'], hRis, ...ris.map((r) => r.row)]));

// ---- Carga
const hCar = ['GBM', 'COMAR', 'Militares lotados (BRADO)', 'Ocorrências', 'Ocorrências / Militares lotados', 'Índice de Carga Operacional Relativa', 'Ocorrências', 'Posição', 'Por militar', 'Posição', 'Ocorrências', 'Posição', 'Por militar', 'Posição', 'Ocorrências', 'Posição', 'Por militar', 'Posição'];
const grp = ['', '', '', '', '', '', 'APH (emergência médica e acidente de trânsito)', '', '', '', 'Multiemprego (exceto emergência médica)', '', '', '', 'Incêndio estrutural', '', '', ''];
const cargas = dados.map((d) => d.oc / d.efAtual);
const cmin = Math.min(...cargas), cmax = Math.max(...cargas);
const rkc = (arr, v) => [...arr].sort((a, b) => b - a).indexOf(v) + 1;
const nat = (d, oc) => [oc, rkc(dados.map((x) => x.nUr), oc), br(oc / d.efAtual), rkc(dados.map((x) => x.nUr / x.efAtual), oc / d.efAtual)];
const car = dados.map((d, i) => [d.n, d.comar, d.efAtual, d.oc, br(cargas[i]), br(1 + 4 * (cargas[i] - cmin) / (cmax - cmin)), ...nat(d, d.nUr), ...nat(d, d.nMulti), ...nat(d, d.nInc)]);
car.push(['TOTAL', '', totEf, totOc, br(totOc / totEf), '', '', '', '', '', '', '', '', '', '', '', '', '']);
writeFileSync(join(dir, 't-carga.csv'), csv([['Carga operacional (dados fictícios)'], grp, hCar, ...car]));

// ---- Params
const mat = (titulo, f) => [[titulo], ['GBM', ...gbms.map((g) => g.n)], ...gbms.map((a, i) => [a.n, ...gbms.map((b, j) => (i === j ? '' : br(f(i, j), 1)))])];
const dist = (i, j) => Math.abs(i - j) * 2.3 + 3 + ((i * 7 + j * 3) % 5);
const par = [
  ['Parâmetros (dados fictícios)'], [],
  ['Fonte: Anexo II do estudo (documento anexado ao processo).'], [],
  ['Complexidade', 'Atendimentos', '', 'β'], ['Baixa', '≤2', '', '1,0'], ['Média', '3', '', '6,1'], ['Alta', '4+', '', '29,4'], [],
  ['Pontos', 'DOP', 'Isolamento', 'PDO', 'Classe DOP', 'Classe isolamento', 'Classe PDO'],
  ...[1, 2, 3, 4, 5, 6].map((p) => [p, br(p * 8, 1), br(p * 120, 0), br(p * 20, 1), `Classe ${p}`, `Classe ${p}`, `Classe ${p}`]), [],
  ['Critério', 'Peso'], ['Demanda operacional', '2'], ['Isolamento geográfico', '1'], ['Potencial de demanda', '1'], ['Riscos estruturais (fator D)', '1'], [],
  ['Pontos', 'Extensão (ha)', 'Edificações'], ...[1, 2, 3, 4, 5, 6].map((p) => [p, p * 1500, p * 6]), [],
  ['Nível', 'Pontos'], ...[1, 2, 3, 4, 5].map((n) => [n, n]), [],
  ['Subcritério', 'Peso'], ['Extensão da área', '1'], ['Edificações elevadas', '1'], ['Risco da área', '2'], [],
  ['Fator multiplicador da cota GSV 12h', '2,5'], ['Adicional oficial de dia (base)', '4'], ['Adicional oficial de dia (acréscimo de afastamento)', '30%'], [],
  ...mat('Distância entre GBMs (km)', dist), [], ...mat('Tempo de deslocamento entre GBMs (min)', (i, j) => dist(i, j) * 1.4), [],
];
writeFileSync(join(dir, 't-params.csv'), csv(par));
console.log('Fixtures gravadas em', dir);
