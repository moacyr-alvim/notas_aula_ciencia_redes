/* Testes da matemática da demo (redes-core.js).  Uso: node tests/redes-core.test.js */
"use strict";
const K = require("../assets/redes-core.js");
let fails = 0;
function check(name, ok, info) { console.log((ok ? "ok   " : "FALHA"), name, info || ""); if (!ok) fails++; }
const near = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-9 : tol);

// L = D − A no caminho de 3 vértices
const L3 = K.laplacian(3, [[0, 1], [1, 2]]);
check("caminho de 3: L = [[1,-1,0],[-1,2,-1],[0,-1,1]]", JSON.stringify(L3) === JSON.stringify([[1, -1, 0], [-1, 2, -1], [0, -1, 1]]));
const e3 = K.eigSym(L3);
check("caminho de 3: autovalores 0, 1, 3", near(e3.values[0], 0) && near(e3.values[1], 1, 1e-10) && near(e3.values[2], 3, 1e-10), e3.values.join(", "));

for (const id of Object.keys(K.REDES)) {
  const M = K.prepara(id), n = M.n;
  check(`${id}: linhas de L somam zero`, M.L.every(r => near(r.reduce((s, x) => s + x, 0), 0)));
  check(`${id}: L simétrica`, M.L.every((r, i) => r.every((x, j) => x === M.L[j][i])));
  // L q = λ q e ortonormalidade
  let res = 0, orto = 0;
  M.eig.vectors.forEach((q, k) => {
    for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += M.L[i][j] * q[j]; res = Math.max(res, Math.abs(s - M.eig.values[k] * q[i])); }
    M.eig.vectors.forEach((p, l) => { let s = 0; for (let i = 0; i < n; i++) s += p[i] * q[i]; orto = Math.max(orto, Math.abs(s - (k === l ? 1 : 0))); });
  });
  check(`${id}: autopares (resíduo e ortonormalidade < 1e-9)`, res < 1e-9 && orto < 1e-9, `res=${res.toExponential(1)} orto=${orto.toExponential(1)}`);
  check(`${id}: um só autovalor nulo (conexa) e o resto > 0`, M.eig.values[0] === 0 && M.eig.values[1] > 1e-6);
  check(`${id}: posições dentro de [0,1]²`, M.pos.length === n && M.pos.every(p => p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1));

  // evolução: conservação, princípio do máximo, limite = média, e comparação com Runge–Kutta
  const u0 = new Array(n).fill(0); u0[M.fonte] = 1;
  const a = K.coefs(M.eig, u0);
  let somaOk = true, maxOk = true, minOk = true, prevMax = 1, prevMin = 0;
  for (let j = 0; j <= 200; j++) {
    const u = K.evolve(M.eig, a, 1, M.tmax * j / 200), s = u.reduce((x, y) => x + y, 0), mx = Math.max(...u), mn = Math.min(...u);
    somaOk = somaOk && near(s, 1, 1e-10); maxOk = maxOk && mx <= prevMax + 1e-10; minOk = minOk && mn >= prevMin - 1e-10; prevMax = mx; prevMin = mn;
  }
  check(`${id}: soma = 1 o tempo todo`, somaOk);
  check(`${id}: o máximo nunca sobe e o mínimo nunca desce`, maxOk && minOk);
  const uLong = K.evolve(M.eig, a, 1, 200 / M.lambda2);
  check(`${id}: para t grande, todos na média 1/n`, uLong.every(x => near(x, 1 / n, 1e-12)));
  // RK4 em u' = −L u até t = 1
  let u = u0.slice(); const h = 1e-3, f = v => M.L.map(r => -r.reduce((s, x, j) => s + x * v[j], 0));
  for (let k = 0; k < 1000; k++) {
    const k1 = f(u), k2 = f(u.map((x, i) => x + h / 2 * k1[i])), k3 = f(u.map((x, i) => x + h / 2 * k2[i])), k4 = f(u.map((x, i) => x + h * k3[i]));
    u = u.map((x, i) => x + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }
  const ue = K.evolve(M.eig, a, 1, 1), err = Math.max(...u.map((x, i) => Math.abs(x - ue[i])));
  check(`${id}: solução espectral = Runge–Kutta em t = 1`, err < 1e-9, `erro=${err.toExponential(1)}`);
}

// valores citados no texto
check("caratê: 34 vértices, 78 laços, λ₂ ≈ 0,4685 (networkx, sem pesos)", K.carate().n === 34 && K.carate().edges.length === 78 && near(K.prepara("carate").lambda2, 0.4685, 5e-5), K.prepara("carate").lambda2.toFixed(5));
const gr = K.degrees(K.adjacency(34, K.carate().edges));
check("caratê: grau do vértice 0 é 16 e do 16 é 2", gr[0] === 16 && gr[16] === 2);
const est = K.prepara("estrela"), ev = est.eig.values;
check("estrela de 9: autovalores 0, 1 (7 vezes) e 9", near(ev[0], 0) && ev.slice(1, 8).every(x => near(x, 1, 1e-10)) && near(ev[8], 9, 1e-10));
// do centro: u(t) = (1 + e^{−9t} w)/9
const ac = K.coefs(est.eig, [1, 0, 0, 0, 0, 0, 0, 0, 0]), uc = K.evolve(est.eig, ac, 1, 0.3);
check("estrela, do centro: u₀(t) = (1 + 8e^{−9t})/9", near(uc[0], (1 + 8 * Math.exp(-2.7)) / 9, 1e-12));
const cam = K.prepara("caminho");
check("caminho de 8: λ₂ = 2 − 2cos(π/8) ≈ 0,152 e 1/λ₂ ≈ 6,6", near(cam.lambda2, 2 - 2 * Math.cos(Math.PI / 8), 1e-10) && Math.abs(1 / cam.lambda2 - 6.57) < 0.01, (1 / cam.lambda2).toFixed(3));
const v = []; for (let i = 0; i < 8; i++) v.push(Math.cos(Math.PI * (i + 0.5) / 8));
const Lv = cam.L.map(r => r.reduce((s, x, j) => s + x * v[j], 0));
check("caminho de 8: cos(π(i+½)/n) é autovetor de λ₂ (exercício 5)", Lv.every((x, i) => near(x, cam.lambda2 * v[i], 1e-12)));
const Kn = K.eigSym(K.laplacian(6, [].concat(...[0, 1, 2, 3, 4, 5].map(i => [0, 1, 2, 3, 4, 5].filter(j => j > i).map(j => [i, j])))));
check("completo de 6: autovalores 0 e 6 (5 vezes)", near(Kn.values[0], 0) && Kn.values.slice(1).every(x => near(x, 6, 1e-10)));

console.log("\nfalhas:", fails);
process.exit(fails ? 1 : 0);
