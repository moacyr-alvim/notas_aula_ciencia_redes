/* Testes do modelo SIS em tempo discreto (epi-core.js).  Uso: node tests/epi-core.test.js */
"use strict";
const E = require("../assets/epi-core.js");
let fails = 0;
function check(name, ok, info) { console.log((ok ? "ok   " : "FALHA"), name, info || ""); if (!ok) fails++; }
const near = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-9 : tol);

const beta = 0.05, k = 8, mu = 0.2, R0 = beta * k / mu, r = 1 - mu + beta * k;
// equação clássica: começo geométrico com razão r, equilíbrio 1 − 1/R0, ponto fixo
const cl = E.serie(E.passoClassico, 1e-6, beta, k, mu, 400);
check("clássica: i_{t+1}/i_t → r = 1 − μ + β⟨k⟩ quando i é pequeno", near(cl[2] / cl[1], r, 1e-5));
check("clássica: converge para 1 − 1/R0 = 0,5", near(cl[400], 1 - 1 / R0, 1e-9));
check("clássica: 1 − 1/R0 é ponto fixo", near(E.passoClassico(1 - 1 / R0, beta, k, mu), 1 - 1 / R0, 1e-15));
check("clássica: com R0 < 1, some", E.serie(E.passoClassico, 0.1, 0.02, 8, 0.2, 300)[300] < 1e-6);
check("r − 1 = μ(R0 − 1)", near(r - 1, mu * (R0 - 1), 1e-15));
// forma exata: mesma razão no começo, equilíbrio menor
const ex = E.serie(E.passoExato, 1e-6, beta, k, mu, 400);
check("exata: mesma razão r no começo", near(ex[2] / ex[1], r, 1e-5));
check("exata: equilíbrio ≈ 0,4585, abaixo de 1 − 1/R0", near(ex[400], 0.4585, 1e-3) && ex[400] < 0.5);
let ok = true; for (let i = 0.01; i < 1; i += 0.01) if (E.passoExato(i, beta, k, mu) > E.passoClassico(i, beta, k, mu) + 1e-15) ok = false;
check("exata ≤ clássica em todo i (a clássica conta duas vezes quem é atingido por dois contatos)", ok);
// R0 = β⟨k⟩·E[duração], com duração geométrica: Σ_{t≥0} β⟨k⟩(1 − μ)^t
let soma = 0; for (let t = 0; t < 2000; t++) soma += beta * k * Math.pow(1 - mu, t);
check("Σ β⟨k⟩(1 − μ)^t = β⟨k⟩/μ", near(soma, R0, 1e-9));
// duplicação → R0 (exercício)
const rr = Math.pow(2, 1 / 5), R0d = 1 + (rr - 1) * 7;
check("exercício: duplica a cada 5 dias, infecção de 7 dias ⇒ R0 ≈ 2,04", near(R0d, 2.04, 0.005), R0d.toFixed(4));
check("exercício: r^(1/μ) = 1,2^5 ≈ 2,49 > R0 = 2", near(Math.pow(1.2, 5), 2.48832, 1e-5));

// redes geradas
const Rg = E.rng(3), reg = E.regularAleatoria(1600, 8, Rg);
const set = new Set(); let dup = 0, laco = 0;
reg.forEach((l, i) => l.forEach(j => { if (i === j) laco++; if (i < j) { const c = i + "," + j; if (set.has(c)) dup++; set.add(c); } }));
check("regular aleatória: todos com grau 8, sem repetidos nem laços num vértice só", reg.every(l => l.length === 8) && dup === 0 && laco === 0);
const er = E.erdosRenyi(1600, 8, E.rng(4)), gm = er.reduce((s, l) => s + l.length, 0) / 1600;
check("Erdős–Rényi: grau médio ≈ 8", near(gm, 8, 0.4), gm.toFixed(2));
check("anel: cada um com k vizinhos, simétrico", E.anel(100, 6).every((l, i) => l.length === 6 && l.every(j => E.anel(100, 6)[j].includes(i))));

// simulações (médias de várias): mistura bate com a forma exata; rede fixa um pouco abaixo; anel muito abaixo
const N = 1600, T = 150, runs = 20;
function media(rede) {
  const m = new Array(T + 1).fill(0);
  for (let s = 1; s <= runs; s++) E.simula({ n: N, k, beta, mu, T, rede, seed: s, i0: 16 }).frac.forEach((x, t) => m[t] += x / runs);
  return m;
}
const eqf = m => m.slice(100).reduce((a, b) => a + b, 0) / 51;
const mm = media("mistura"), me = media("er"), mr = media("regular"), ma = media("anel");
check("simulação com mistura: equilíbrio ≈ forma exata (0,4585)", near(eqf(mm), 0.4585, 0.015), eqf(mm).toFixed(4));
check("simulação com mistura: razão no começo ≈ 1,2", near(E.razaoInicial(mm, 0.02), 1.2, 0.03), E.razaoInicial(mm, 0.02).toFixed(3));
check("redes aleatórias fixas: equilíbrio entre 0,40 e o da mistura", eqf(me) > 0.4 && eqf(me) < eqf(mm) && eqf(mr) > 0.4 && eqf(mr) < eqf(mm), eqf(me).toFixed(3) + " " + eqf(mr).toFixed(3));
check("regular fixa: razão perto de 1 − μ + β(k − 1) = 1,15", near(E.razaoInicial(mr, 0.02), 1.15, 0.03), E.razaoInicial(mr, 0.02).toFixed(3));
check("anel: muito abaixo da previsão (equilíbrio < 0,2)", eqf(ma) < 0.2, eqf(ma).toFixed(3));

// ---------- SIR ----------
const S1 = E.serieSIR(1e-4, 0.05, 8, 0.2, 600);
check("SIR: s + i + r = 1 sempre, e s nunca sobe", S1.every(x => near(x[0] + x[1] + x[2], 1, 1e-12)) && S1.every((x, t) => !t || x[0] <= S1[t - 1][0] + 1e-15));
check("SIR: mesma razão r do SIS no começo", near(S1[2][1] / S1[1][1], 1.2, 1e-3));
let tp = 0; S1.forEach((x, t) => { if (x[1] > S1[tp][1]) tp = t; });
check("SIR: no pico, s cruza 1/R0 (antes acima, no pico abaixo ou igual)", S1[tp - 1][0] > 0.5 && S1[tp][0] <= 0.5 + 1e-12);
check("SIR (R0 = 2, μ = 0,2): pico 16,1%, fórmula 15,3%", near(S1[tp][1], 0.161, 0.001) && near(E.picoAprox(2), 0.1534, 1e-4));
const S2 = E.serieSIR(1e-4, 0.005, 8, 0.02, 6000); let tp2 = 0; S2.forEach((x, t) => { if (x[1] > S2[tp2][1]) tp2 = t; });
check("SIR (R0 = 2, μ = 0,02): pico 15,4%, perto da fórmula", near(S2[tp2][1], 0.1542, 0.0005));
check("tamanho final: R0 = 2 → 79,7%; R0 = 3 → 94,0%; R0 < 1 → 0", near(E.tamanhoFinal(2), 0.7968, 1e-4) && near(E.tamanhoFinal(3), 0.9405, 1e-4) && E.tamanhoFinal(0.8) === 0);
check("tabela: picos 6,3 / 15,3 / 30,0 / 47,8 %", [1.5, 2, 3, 5].map(R => (100 * E.picoAprox(R)).toFixed(1)).join(" ") === "6.3 15.3 30.0 47.8");
check("imunidade de rebanho: com s0 < 1/R0 a epidemia não cresce", E.serieSIR(1e-4, 0.05, 8, 0.2, 1).length && (() => { const x = [0.45, 1e-4, 0.55 - 1e-4]; const y = E.passoSIR(x, 0.05, 8, 0.2); return y[1] < x[1]; })());

console.log("\nfalhas:", fails);
process.exit(fails ? 1 : 0);
