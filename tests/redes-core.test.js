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

console.log("\nfalhas:", fails);
process.exit(fails ? 1 : 0);
