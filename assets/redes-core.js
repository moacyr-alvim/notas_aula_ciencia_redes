/* Núcleo das páginas: difusão em passos numa rede,  u_{k+1} = u_k − c L u_k,  com  L = Bᵀ B = D − A.
 * Sem DOM: roda no navegador e no Node (testes).
 *
 *   B (m × n), matriz de incidência: a linha do laço i→j tem −1 na coluna i e +1 na coluna j (orientação arbitrária)
 *
 *   arestas: [i, j] ou [i, j, w] (w = peso do laço, 1 por padrão); índices a partir de 0; rede não dirigida
 *   pos:     posições em [0,1]² para desenhar
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RedesCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function zeros(n, m) { var A = [], i; for (i = 0; i < n; i++) A.push(new Array(m == null ? n : m).fill(0)); return A; }

  /* matriz de adjacência (simétrica) */
  function adjacency(n, edges) {
    var A = zeros(n);
    edges.forEach(function (e) { var w = e.length > 2 ? e[2] : 1; A[e[0]][e[1]] += w; A[e[1]][e[0]] += w; });
    return A;
  }
  function degrees(A) { return A.map(function (r) { return r.reduce(function (s, x) { return s + x; }, 0); }); }

  /* matriz de incidência B (m × n) */
  function incidence(n, edges) {
    var B = zeros(edges.length, n);
    edges.forEach(function (e, k) { B[k][e[0]] = -1; B[k][e[1]] = 1; });
    return B;
  }
  /* Bᵀ B (para conferir com D − A) */
  function btb(B, n) {
    var L = zeros(n);
    B.forEach(function (r) { for (var i = 0; i < n; i++) if (r[i]) for (var j = 0; j < n; j++) if (r[j]) L[i][j] += r[i] * r[j]; });
    return L;
  }

  /* L = D − A  (= Bᵀ C B, com C = diag dos pesos) */
  function laplacian(n, edges) {
    var A = adjacency(n, edges), d = degrees(A);
    return A.map(function (r, i) { return r.map(function (x, j) { return (i === j ? d[i] : 0) - x; }); });
  }

  /* autovalores e autovetores de uma matriz simétrica pelo método de Jacobi (n pequeno, até ~60).
   * values em ordem crescente; vectors[k] é o autovetor (norma 1) de values[k]. */
  function eigSym(A0) {
    var n = A0.length, A = A0.map(function (r) { return r.slice(); }), V = zeros(n), i, j, k, sweep;
    for (i = 0; i < n; i++) V[i][i] = 1;
    for (sweep = 0; sweep < 100; sweep++) {
      var off = 0; for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
      if (off < 1e-26) break;
      for (var p = 0; p < n - 1; p++) for (var q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-300) continue;
        var th = (A[q][q] - A[p][p]) / (2 * A[p][q]), t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1)),
            c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (k = 0; k < n; k++) { var akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
        for (k = 0; k < n; k++) { var apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
        for (k = 0; k < n; k++) { var vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
      }
    }
    var idx = []; for (i = 0; i < n; i++) idx.push(i);
    idx.sort(function (a, b) { return A[a][a] - A[b][b]; });
    var values = idx.map(function (i) { return Math.abs(A[i][i]) < 1e-10 ? 0 : A[i][i]; });
    var vectors = idx.map(function (c) { var v = []; for (var r = 0; r < n; r++) v.push(V[r][c]); return v; });
    return { values: values, vectors: vectors };
  }

  /* um passo de Euler com Δt = 1:  u ← u − c L u */
  function passo(L, u, c) {
    var n = u.length, v = new Array(n), i, j, s;
    for (i = 0; i < n; i++) { s = 0; for (j = 0; j < n; j++) s += L[i][j] * u[j]; v[i] = u[i] - c * s; }
    return v;
  }
  /* os estados u_0, u_1, …, u_K */
  function itera(L, u0, c, K) {
    var out = [u0.slice()], u = u0.slice();
    for (var k = 0; k < K; k++) { u = passo(L, u, c); out.push(u); }
    return out;
  }
  /* u_k pelos modos:  Σ_j (1 − c λ_j)^k a_j q_j */
  function modos(eig, a, c, k) {
    var n = eig.vectors.length, u = new Array(n).fill(0);
    eig.values.forEach(function (lam, j) {
      var q = eig.vectors[j], f = a[j] * Math.pow(1 - c * lam, k);
      for (var i = 0; i < n; i++) u[i] += f * q[i];
    });
    return u;
  }

  /* coeficientes a_k = q_kᵀ u0 (calcular uma vez por dado inicial) */
  function coefs(eig, u0) {
    return eig.vectors.map(function (q) { var a = 0; for (var i = 0; i < u0.length; i++) a += q[i] * u0[i]; return a; });
  }
  /* u(t) = Σ_k e^{−c λ_k t} a_k q_k */
  function evolve(eig, a, c, t) {
    var n = eig.vectors.length, u = new Array(n).fill(0);
    eig.values.forEach(function (lam, k) {
      var q = eig.vectors[k], f = a[k] * Math.exp(-c * lam * t);
      for (var i = 0; i < n; i++) u[i] += f * q[i];
    });
    return u;
  }

  /* ---------- catálogo de redes ---------- */
  function caminho(n) {
    var e = [], p = [], i;
    for (i = 0; i < n; i++) { p.push([0.07 + 0.86 * i / (n - 1), 0.5]); if (i) e.push([i - 1, i]); }
    return { n: n, edges: e, pos: p };
  }
  function anel(n) {
    var e = [], p = [], i;
    for (i = 0; i < n; i++) { var a = Math.PI / 2 - 2 * Math.PI * i / n; p.push([0.5 + 0.4 * Math.cos(a), 0.5 - 0.4 * Math.sin(a)]); e.push([i, (i + 1) % n]); }
    return { n: n, edges: e, pos: p };
  }
  function estrela(n) {   // vértice 0 no centro, n − 1 folhas
    var e = [], p = [[0.5, 0.5]], i;
    for (i = 1; i < n; i++) { var a = Math.PI / 2 - 2 * Math.PI * (i - 1) / (n - 1); p.push([0.5 + 0.4 * Math.cos(a), 0.5 - 0.4 * Math.sin(a)]); e.push([0, i]); }
    return { n: n, edges: e, pos: p };
  }
  function grade(k) {     // k × k, vértice r*k + c
    var e = [], p = [], r, c;
    for (r = 0; r < k; r++) for (c = 0; c < k; c++) {
      p.push([0.1 + 0.8 * c / (k - 1), 0.1 + 0.8 * r / (k - 1)]);
      if (c) e.push([r * k + c - 1, r * k + c]);
      if (r) e.push([(r - 1) * k + c, r * k + c]);
    }
    return { n: k * k, edges: e, pos: p };
  }
  function doisGrupos(k) { // dois grupos completos de k vértices e um único laço entre eles (k − 1 — k)
    var e = [], p = [], g, i, j;
    for (g = 0; g < 2; g++) for (i = 0; i < k; i++) {
      for (j = i + 1; j < k; j++) e.push([g * k + i, g * k + j]);
      // ângulos escolhidos para que as pontas da ponte (k − 1 e k) fiquem uma de frente para a outra
      var a = g ? Math.PI + 2 * Math.PI * i / k : 2 * Math.PI * (i + 1) / k;
      p.push([0.25 + 0.5 * g + 0.2 * Math.cos(a), 0.5 - 0.2 * Math.sin(a)]);
    }
    e.push([k - 1, k]);
    return { n: 2 * k, edges: e, pos: p };
  }
  /* Clube de caratê de Zachary (1977), sem pesos: 34 membros, 78 laços. Posições de Kamada–Kawai. */
  var KARATE_E = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,10],[0,11],[0,12],[0,13],[0,17],[0,19],[0,21],[0,31],[1,2],[1,3],[1,7],[1,13],[1,17],[1,19],[1,21],[1,30],[2,3],[2,7],[2,8],[2,9],[2,13],[2,27],[2,28],[2,32],[3,7],[3,12],[3,13],[4,6],[4,10],[5,6],[5,10],[5,16],[6,16],[8,30],[8,32],[8,33],[9,33],[13,33],[14,32],[14,33],[15,32],[15,33],[18,32],[18,33],[19,33],[20,32],[20,33],[22,32],[22,33],[23,25],[23,27],[23,29],[23,32],[23,33],[24,25],[24,27],[24,31],[25,31],[26,29],[26,33],[27,33],[28,31],[28,33],[29,32],[29,33],[30,32],[30,33],[31,32],[31,33],[32,33]];
  var KARATE_P = [[0.482,0.555],[0.293,0.545],[0.529,0.257],[0.671,0.476],[0.708,0.697],[0.665,0.747],[0.572,0.778],[0.644,0.568],[0.363,0.516],[0.464,0.262],[0.51,0.685],[0.289,0.761],[0.529,0.587],[0.597,0.384],[0.156,0.385],[0.06,0.192],[0.702,0.94],[0.323,0.597],[0.261,0.271],[0.377,0.431],[0.289,0.366],[0.367,0.664],[0.249,0.159],[0.512,0.06],[0.798,0.373],[0.94,0.3],[0.154,0.324],[0.655,0.187],[0.51,0.35],[0.372,0.202],[0.156,0.486],[0.615,0.45],[0.329,0.265],[0.354,0.363]];
  function carate() { return { n: 34, edges: KARATE_E.map(function (e) { return e.slice(); }), pos: KARATE_P.map(function (p) { return p.slice(); }) }; }

  var REDES = {
    carate:  { label: "Clube de caratê (34)", make: carate,                          fonte: 0 },
    caminho: { label: "Caminho (8)",          make: function () { return caminho(8); }, fonte: 0 },
    anel:    { label: "Anel (12)",            make: function () { return anel(12); },   fonte: 0 },
    estrela: { label: "Estrela (9)",          make: function () { return estrela(9); }, fonte: 0 },
    grade:   { label: "Grade 5 × 5",          make: function () { return grade(5); },   fonte: 0 },
    grupos:  { label: "Dois grupos (2 × 6)",  make: function () { return doisGrupos(6); }, fonte: 0 }
  };

  /* Prepara uma rede para a demo: espectro, graus, grau máximo e maior autovalor. */
  function prepara(id) {
    var R = REDES[id], g = R.make(), L = laplacian(g.n, g.edges), eig = eigSym(L);
    var d = degrees(adjacency(g.n, g.edges));
    return { id: id, n: g.n, edges: g.edges, pos: g.pos, L: L, eig: eig, lambda2: eig.values[1], lambdaMax: eig.values[g.n - 1],
             graus: d, dmax: Math.max.apply(null, d), fonte: R.fonte };
  }

  return { adjacency: adjacency, degrees: degrees, incidence: incidence, btb: btb, laplacian: laplacian, eigSym: eigSym,
           passo: passo, itera: itera, modos: modos, coefs: coefs, evolve: evolve,
           caminho: caminho, anel: anel, estrela: estrela, grade: grade, doisGrupos: doisGrupos, carate: carate,
           REDES: REDES, prepara: prepara };
});
