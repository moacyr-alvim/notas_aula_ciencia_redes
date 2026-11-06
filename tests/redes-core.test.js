/* Testes da matemática da demo (redes-core.js).  Uso: node tests/redes-core.test.js */
"use strict";
const K = require("../assets/redes-core.js");
let fails = 0;
function check(name, ok, info) { console.log((ok ? "ok   " : "FALHA"), name, info || ""); if (!ok) fails++; }
const near = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-9 : tol);
const same = (A, B, tol) => A.every((r, i) => r.every((x, j) => near(x, B[i][j], tol)));
const mv = (L, u) => L.map(r => r.reduce((s, x, j) => s + x * u[j], 0));

// caminho de 3 vértices: B, L = BᵀB, autovalores, um passo com c = 1/3
const E3 = [[0, 1], [1, 2]], B3 = K.incidence(3, E3), L3 = K.btb(B3, 3);
check("caminho de 3: B = [[-1,1,0],[0,-1,1]]", JSON.stringify(B3) === JSON.stringify([[-1, 1, 0], [0, -1, 1]]));
check("caminho de 3: BᵀB = [[1,-1,0],[-1,2,-1],[0,-1,1]] = D − A", JSON.stringify(L3) === JSON.stringify([[1, -1, 0], [-1, 2, -1], [0, -1, 1]]) && same(L3, K.laplacian(3, E3)));
const e3 = K.eigSym(L3);
check("caminho de 3: autovalores 0, 1, 3", near(e3.values[0], 0) && near(e3.values[1], 1, 1e-10) && near(e3.values[2], 3, 1e-10));
const u1 = K.passo(L3, [1, 0, 0], 1 / 3);
check("caminho de 3, c = 1/3: (1,0,0) → (2/3, 1/3, 0) (exercício 1)", near(u1[0], 2 / 3) && near(u1[1], 1 / 3) && near(u1[2], 0));
const u1m = K.passo(L3, [-1, 2, -1], 1 / 3);
check("caminho de 3, c = 1/3: o modo (1,−2,1) some em um passo", u1m.every(x => near(x, 0)));

for (const id of Object.keys(K.REDES)) {
  const M = K.prepara(id), n = M.n, B = K.incidence(n, M.edges);
  check(`${id}: BᵀB = D − A`, same(K.btb(B, n), M.L));
  // orientação trocada não muda L
  const Bt = K.incidence(n, M.edges.map((e, k) => k % 2 ? [e[1], e[0]] : e));
  check(`${id}: trocar orientações não muda L`, same(K.btb(Bt, n), M.L));
  check(`${id}: B·1 = 0 (cada linha tem +1 e −1)`, B.every(r => r.reduce((s, x) => s + x, 0) === 0));
  // u'Lu = |Bu|² para um vetor qualquer
  const v = Array.from({ length: n }, (_, i) => Math.sin(3.7 * i + 1)), Bv = B.map(r => r.reduce((s, x, j) => s + x * v[j], 0));
  check(`${id}: vᵀLv = |Bv|²`, near(v.reduce((s, x, i) => s + x * mv(M.L, v)[i], 0), Bv.reduce((s, x) => s + x * x, 0), 1e-9));
  let res = 0, orto = 0;
  M.eig.vectors.forEach((q, k) => {
    const Lq = mv(M.L, q); for (let i = 0; i < n; i++) res = Math.max(res, Math.abs(Lq[i] - M.eig.values[k] * q[i]));
    M.eig.vectors.forEach((p, l) => { const s = p.reduce((a, x, i) => a + x * q[i], 0); orto = Math.max(orto, Math.abs(s - (k === l ? 1 : 0))); });
  });
  check(`${id}: autopares (resíduo e ortonormalidade < 1e-9)`, res < 1e-9 && orto < 1e-9);
  check(`${id}: conexa (um só autovalor nulo) e λ_max ≤ 2·d_max`, M.eig.values[0] === 0 && M.lambda2 > 1e-6 && M.lambdaMax <= 2 * M.dmax + 1e-9);
  check(`${id}: posições dentro de [0,1]²`, M.pos.length === n && M.pos.every(p => p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1));

  // passos com c = 0,9/d_max: soma, positividade, princípio do máximo, modos, limite
  const c = 0.9 / M.dmax, u0 = new Array(n).fill(0); u0[M.fonte] = 1;
  const S = K.itera(M.L, u0, c, 300), a = K.coefs(M.eig, u0);
  let ok1 = true, ok2 = true, ok3 = true, ok4 = true;
  S.forEach((u, k) => {
    ok1 = ok1 && near(u.reduce((x, y) => x + y, 0), 1, 1e-10);
    ok2 = ok2 && u.every(x => x >= -1e-14);
    if (k) ok3 = ok3 && Math.max(...u) <= Math.max(...S[k - 1]) + 1e-12 && Math.min(...u) >= Math.min(...S[k - 1]) - 1e-12;
    const um = K.modos(M.eig, a, c, k); ok4 = ok4 && u.every((x, i) => near(x, um[i], 1e-10));
  });
  check(`${id}: soma = 1 em todos os passos`, ok1);
  check(`${id}: c ≤ 1/d_max ⇒ ninguém negativo`, ok2);
  check(`${id}: o máximo nunca sobe e o mínimo nunca desce`, ok3);
  check(`${id}: Euler passo a passo = fórmula dos modos (1 − cλ)^k`, ok4);
  const uL = K.modos(M.eig, a, c, Math.ceil(60 / (c * M.lambda2)));
  check(`${id}: depois de muitos passos, todos na média`, uL.every(x => near(x, 1 / n, 1e-12)));
  // c grande demais: c·λ_max > 2 explode
  const cg = 2.5 / M.dmax;
  if (cg * M.lambdaMax > 2) {
    const Sg = K.itera(M.L, u0, cg, 200);
    check(`${id}: c = 2,5/d_max (cλ_max > 2) faz as diferenças crescerem`, Math.max(...Sg[200].map(Math.abs)) > 10);
  }
}

// valores citados no texto
const kar = K.prepara("carate");
check("caratê: 34 vértices, 78 laços, d_max = 17, λ₂ ≈ 0,4685", kar.n === 34 && kar.edges.length === 78 && kar.dmax === 17 && near(kar.lambda2, 0.4685, 5e-5));
check("caratê: grau do 0 é 16, do 16 é 2; 1/(cλ₂) ≈ 40 com c = 0,9/17", kar.graus[0] === 16 && kar.graus[16] === 2 && near(1 / (0.9 / 17 * kar.lambda2), 40.3, 0.05));
// dois vértices
const L2 = K.laplacian(2, [[0, 1]]);
const p = c => K.passo(L2, [1, 0], c);
check("dois vértices: c = 1/2 → (1/2, 1/2); c = 1 → (0, 1); c = 3/2 → (−1/2, 3/2)", near(p(0.5)[0], 0.5) && near(p(1)[0], 0) && near(p(1)[1], 1) && near(p(1.5)[0], -0.5) && near(p(1.5)[1], 1.5));
const s2 = K.itera(L2, [1, 0], 1.5, 2)[2];
check("dois vértices, c = 3/2: depois de dois passos (5/2, −3/2)", near(s2[0], 2.5) && near(s2[1], -1.5));
// anel par com c = 1/2: o xadrez não morre
const An = K.anel(12), Lan = K.laplacian(12, An.edges), xad = Array.from({ length: 12 }, (_, i) => i % 2 ? -1 : 1);
const xad1 = K.passo(Lan, xad, 0.5);
check("anel de 12, c = 1/2: o xadrez (1,−1,…) troca de sinal e não decai", xad1.every((x, i) => near(x, -xad[i])));
// completo: c = 1/n leva à média em um passo
const comp = []; for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) comp.push([i, j]);
const Lc = K.laplacian(6, comp), uc = K.passo(Lc, [1, 0, 0, 0, 0, 0], 1 / 6);
check("completo de 6, c = 1/6: média em um passo", uc.every(x => near(x, 1 / 6)));
check("completo de 6: autovalores 0 e 6 (5 vezes)", K.eigSym(Lc).values.slice(1).every(x => near(x, 6, 1e-10)));
// estrela de 9: autovalores, um passo do centro com c = 1/9, folha decai como (1 − c)^k
const est = K.prepara("estrela"), ev = est.eig.values;
check("estrela de 9: autovalores 0, 1 (7 vezes) e 9", near(ev[0], 0) && ev.slice(1, 8).every(x => near(x, 1, 1e-10)) && near(ev[8], 9, 1e-10));
const e0 = new Array(9).fill(0); e0[0] = 1;
check("estrela de 9, c = 1/9: do centro, média em um passo", K.passo(est.L, e0, 1 / 9).every(x => near(x, 1 / 9)));
const e1 = new Array(9).fill(0); e1[1] = 1; const Sf = K.itera(est.L, e1, 1 / 9, 20);
check("estrela de 9, c = 1/9: de uma folha, as diferenças entre folhas caem por (8/9) a cada passo", near(Sf[20][1] - Sf[20][2], Math.pow(8 / 9, 20), 1e-12));
// caminho de 8: λ₂ e o autovetor do exercício 6
const cam = K.prepara("caminho");
check("caminho de 8: λ₂ = 2 − 2cos(π/8); 1/(cλ₂) ≈ 14,6 com c = 0,45", near(cam.lambda2, 2 - 2 * Math.cos(Math.PI / 8), 1e-10) && near(1 / (0.45 * cam.lambda2), 14.6, 0.05));
const v8 = Array.from({ length: 8 }, (_, i) => Math.cos(Math.PI * (i + 0.5) / 8));
check("caminho de 8: cos(π(i+½)/n) é autovetor de λ₂", mv(cam.L, v8).every((x, i) => near(x, cam.lambda2 * v8[i], 1e-12)));
check("caminho de 8: c = 0,52 já é instável (cλ_max > 2)", 0.52 * cam.lambdaMax > 2);

// ---------- página Componentes e gargalos ----------
const nulos = (n, e) => K.eigSym(K.laplacian(n, e)).values.filter(x => x === 0).length;
const ncomp = (n, e) => Math.max(...K.componentes(n, e)) + 1;
const ex1 = [[0, 1], [1, 2], [3, 4]];
check("exercício 1: 3 componentes e 3 autovalores nulos", ncomp(6, ex1) === 3 && nulos(6, ex1) === 3);
const Lx = K.laplacian(6, ex1); let ux = [3, 0, 0, 2, 0, 5]; for (let k = 0; k < 400; k++) ux = K.passo(Lx, ux, 0.45);
check("exercício 1: converge para (1,1,1,1,1,5)", ux.every((x, i) => near(x, [1, 1, 1, 1, 1, 5][i], 1e-9)));
const corteK = [[0, 31], [1, 30], [2, 9], [2, 27], [2, 28], [2, 32], [8, 30], [8, 32], [8, 33], [13, 33], [19, 33]];
const restoK = K.carate().edges.filter(e => !corteK.some(c => c[0] === e[0] && c[1] === e[1]));
check("caratê: cortar os 11 laços entre facções deixa 2 componentes e 2 autovalores nulos", restoK.length === 67 && ncomp(34, restoK) === 2 && nulos(34, restoK) === 2);
const sem11 = K.carate().edges.filter(e => e[0] !== 11 && e[1] !== 11);
check("caratê: o vértice 11 tem um laço só, e cortá-lo o isola", K.carate().edges.length - sem11.length === 1 && ncomp(34, sem11) === 2);
const gr = K.prepara("grupos"), semPonte = gr.edges.filter(e => !(e[0] === 5 && e[1] === 6));
check("dois grupos: cortar a ponte 5–6 dá 2 componentes", semPonte.length === gr.edges.length - 1 && ncomp(12, semPonte) === 2 && nulos(12, semPonte) === 2);
check("dois grupos (k = 6, porta 1): λ₂ = 0,2583 ≤ 2/k", near(gr.lambda2, 0.25834, 1e-5) && gr.lambda2 <= 2 / 6);
const an = K.anel(12), anCut = an.edges.slice(1);
const l2a = K.eigSym(K.laplacian(12, an.edges)).values[1], l2c = K.eigSym(K.laplacian(12, anCut)).values[1];
check("anel de 12 → caminho: λ₂ de 0,268 para 0,068 (≈ 1/4)", near(l2a, 2 - 2 * Math.cos(2 * Math.PI / 12), 1e-10) && near(l2c, 2 - 2 * Math.cos(Math.PI / 12), 1e-10), (l2c / l2a).toFixed(3));
// cota do gargalo λ₂ ≤ corte·n/(|S||S̄|), no caratê com as facções
check("caratê: λ₂ = 0,4685 ≤ 11·34/(17·17) = 1,294", kar.lambda2 <= 11 * 34 / 289 && near(11 * 34 / 289, 1.294, 1e-3));
// Rayleigh: para v ⊥ 1, vᵀLv/vᵀv ≥ λ₂
let rayOk = true;
for (let t = 0; t < 50; t++) {
  let v = Array.from({ length: 34 }, (_, i) => Math.sin(1.3 * i * (t + 1) + t)); const m = v.reduce((a, b) => a + b, 0) / 34; v = v.map(x => x - m);
  const Lv = mv(kar.L, v), r = v.reduce((a, x, i) => a + x * Lv[i], 0) / v.reduce((a, x) => a + x * x, 0);
  rayOk = rayOk && r >= kar.lambda2 - 1e-12;
}
const q2k = kar.eig.vectors[1], Lq2 = mv(kar.L, q2k);
check("Rayleigh: vᵀLv/vᵀv ≥ λ₂ para v ⊥ 1, com igualdade em q₂", rayOk && near(q2k.reduce((a, x, i) => a + x * Lq2[i], 0), kar.lambda2, 1e-10));
// estrela: λ₂ = 1 ≤ conectividade de vértices (1); completo: λ₂ = n
check("estrela: λ₂ = 1; completo de 6: λ₂ = 6", near(est.lambda2, 1, 1e-10) && near(K.eigSym(Lc).values[1], 6, 1e-10));

// ---------- página Comunidades pelo vetor de Fiedler ----------
const fac = K.faccoes();
check("facções: 17 e 17, e 11 laços entre elas", fac.filter(Boolean).length === 17 && K.corte(kar.edges, fac) === 11);
let q2c = kar.eig.vectors[1].slice(); if (q2c.reduce((a, x, i) => a + x * (fac[i] ? 1 : -1), 0) < 0) q2c = q2c.map(x => -x);
const dS = K.divide(q2c, kar.edges, "sinal"), dM = K.divide(q2c, kar.edges, "mediana"), dV = K.divide(q2c, kar.edges, "varredura");
const errosDe = d => d.map((x, i) => x !== fac[i] ? i : -1).filter(i => i >= 0).join(",");
check("caratê, sinal de q₂: lados 19/15, corte 10, erra 2 e 8", dS.filter(Boolean).length === 19 && K.corte(kar.edges, dS) === 10 && errosDe(dS) === "2,8");
check("caratê, mediana de q₂: exatamente as facções", errosDe(dM) === "" && K.corte(kar.edges, dM) === 11);
const lV = dV.filter(Boolean).length, menorV = Math.min(lV, 34 - lV), grupoV = dV.map((x, i) => x === (lV < 17) ? i : -1).filter(i => i >= 0).join(",");
check("caratê, varredura: separa o grupinho {4,5,6,10,16} com corte 4", menorV === 5 && K.corte(kar.edges, dV) === 4 && grupoV === "4,5,6,10,16", grupoV);
check("caratê: a cota nλ₂/4 ≈ 3,98 vale para as bisseções", 34 * kar.lambda2 / 4 <= 11 && near(34 * kar.lambda2 / 4, 3.98, 0.01));
const troca = fac.slice(); troca[8] = !troca[8]; troca[9] = !troca[9];
check("caratê: trocar 8 e 9 de lado dá uma bisseção com corte 10", troca.filter(Boolean).length === 17 && K.corte(kar.edges, troca) === 10);
// corte = sᵀLs/4 com s = ±1
const sv = fac.map(x => x ? 1 : -1), Ls = mv(kar.L, sv);
check("corte = sᵀLs/4 para s = ±1", near(sv.reduce((a, x, i) => a + x * Ls[i], 0) / 4, 11));
// varredura minimiza mesmo a razão entre os cortes por limiar
let melhorR = Infinity; const ordQ = q2c.map((_, i) => i).sort((a, b) => q2c[a] - q2c[b]);
for (let j = 1; j < 34; j++) { const l = new Array(34).fill(false); ordQ.slice(j).forEach(i => l[i] = true); melhorR = Math.min(melhorR, K.corte(kar.edges, l) * 34 / (j * (34 - j))); }
check("varredura: acha a menor razão corte·n/(|S||S̄|) entre os limiares", near(K.corte(kar.edges, dV) * 34 / (5 * 29), melhorR, 1e-12));
// modelo de blocos: reprodutível e com acertos altos quando p_out é pequeno
const b1 = K.blocos(16, 0.4, 0.05, 7), b2 = K.blocos(16, 0.4, 0.05, 7);
check("blocos: mesma semente, mesma rede", JSON.stringify(b1.edges) === JSON.stringify(b2.edges) && b1.pos.every(p => p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1));
let acs = 0; for (let sd = 1; sd <= 10; sd++) { const B = K.blocos(16, 0.4, 0.02, sd), e = K.eigSym(K.laplacian(32, B.edges)); acs += K.acertos(K.divide(e.vectors[1], B.edges, "mediana"), B.grupo); }
check("blocos (p_in 0,4, p_out 0,02): mediana de q₂ acerta ≥ 95%", acs / 320 >= 0.95, (acs / 320).toFixed(3));

console.log("\nfalhas:", fails);
process.exit(fails ? 1 : 0);
