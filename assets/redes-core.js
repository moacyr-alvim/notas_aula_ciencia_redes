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

  /* componentes conexas (união-busca): devolve o rótulo 0, 1, 2, … de cada vértice, na ordem em que aparecem */
  function componentes(n, edges) {
    var p = [], i; for (i = 0; i < n; i++) p.push(i);
    var f = function (x) { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
    edges.forEach(function (e) { p[f(e[0])] = f(e[1]); });
    var rot = {}, out = [], c = 0;
    for (i = 0; i < n; i++) { var r = f(i); if (!(r in rot)) rot[r] = c++; out.push(rot[r]); }
    return out;
  }

  /* ---------- comunidades: cortes e divisões a partir de um vetor ---------- */
  /* corte: quantos laços ligam vértices de lados diferentes (lado[i] booleano) */
  function corte(edges, lado) { var c = 0; edges.forEach(function (e) { if (lado[e[0]] !== lado[e[1]]) c += e.length > 2 ? e[2] : 1; }); return c; }
  /* divisões a partir de q: pelo sinal; pela mediana (metade para cada lado); pela melhor varredura,
   * que testa os n − 1 cortes "os j maiores valores de q de um lado" e fica com o de menor razão corte·n/(|S||S̄|) */
  function divide(q, edges, regra) {
    var n = q.length, ordem = q.map(function (_, i) { return i; }).sort(function (a, b) { return q[a] - q[b]; }), lado = new Array(n).fill(false), j;
    if (regra === "sinal") { for (j = 0; j < n; j++) lado[j] = q[j] > 0; return lado; }
    if (regra === "mediana") { for (j = Math.ceil(n / 2); j < n; j++) lado[ordem[j]] = true; return lado; }
    var melhor = Infinity, mj = 1, tent = new Array(n).fill(false), c;
    for (j = n - 1; j >= 1; j--) {           // põe os n − j maiores de um lado, um de cada vez, atualizando o corte
      tent[ordem[j]] = true;
      c = corte(edges, tent);
      var r = c * n / ((n - j) * j);
      if (r < melhor - 1e-12) { melhor = r; mj = j; }
    }
    for (j = mj; j < n; j++) lado[ordem[j]] = true;
    return lado;
  }
  /* acertos de uma divisão contra os grupos verdadeiros (os rótulos podem estar trocados) */
  function acertos(lado, verdade) {
    var a = 0; lado.forEach(function (x, i) { if (x === verdade[i]) a++; });
    return Math.max(a, lado.length - a);
  }

  /* gerador de números pseudoaleatórios com semente (mulberry32) */
  function rng(seed) {
    var t = seed >>> 0;
    return function () { t = (t + 0x6D2B79F5) >>> 0; var x = t; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }
  /* modelo estocástico de blocos: dois grupos de k vértices; laço com probabilidade pin dentro e pout entre */
  function blocos(k, pin, pout, seed) {
    var R = rng(seed), n = 2 * k, e = [], grupo = [], i, j;
    for (i = 0; i < n; i++) grupo.push(i >= k);
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) if (R() < (grupo[i] === grupo[j] ? pin : pout)) e.push([i, j]);
    return { n: n, edges: e, grupo: grupo, pos: molas(n, e, seed + 1) };
  }
  /* desenho por molas (Fruchterman–Reingold), sem olhar os grupos; posições normalizadas para [0,1]² */
  function molas(n, e, seed) {
    var R = rng(seed), P = [], i, it;
    for (i = 0; i < n; i++) P.push([R(), R()]);
    var kk = Math.sqrt(1 / n), T = 0.1;
    for (it = 0; it < 300; it++) {
      var D = P.map(function () { return [0, 0]; });
      for (i = 0; i < n; i++) for (var j = i + 1; j < n; j++) {
        var dx = P[i][0] - P[j][0], dy = P[i][1] - P[j][1], d = Math.max(1e-4, Math.hypot(dx, dy)), f = kk * kk / d;
        D[i][0] += dx / d * f; D[i][1] += dy / d * f; D[j][0] -= dx / d * f; D[j][1] -= dy / d * f;
      }
      e.forEach(function (l) {
        var a = l[0], b = l[1], dx = P[a][0] - P[b][0], dy = P[a][1] - P[b][1], d = Math.max(1e-4, Math.hypot(dx, dy)), f = d * d / kk;
        D[a][0] -= dx / d * f; D[a][1] -= dy / d * f; D[b][0] += dx / d * f; D[b][1] += dy / d * f;
      });
      for (i = 0; i < n; i++) { var m = Math.max(1e-9, Math.hypot(D[i][0], D[i][1])), s = Math.min(m, T); P[i][0] += D[i][0] / m * s; P[i][1] += D[i][1] / m * s; }
      T = Math.max(0.002, T * 0.985);
    }
    var xs = P.map(function (p) { return p[0]; }), ys = P.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys), sc = Math.max(x1 - x0, y1 - y0) || 1;
    return P.map(function (p) { return [0.06 + 0.88 * (p[0] - x0 + (sc - (x1 - x0)) / 2) / sc, 0.06 + 0.88 * (p[1] - y0 + (sc - (y1 - y0)) / 2) / sc]; });
  }

  /* facções reais do clube de caratê (atributo "club" do networkx): true = Officer */
  var KARATE_OFFICER = [9, 14, 15, 18, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33];
  function faccoes() { var f = new Array(34).fill(false); KARATE_OFFICER.forEach(function (i) { f[i] = true; }); return f; }

  /* ---------- redes com sinais: laços [i, j, s] com s = +1 ou −1 ---------- */
  /* Pintura pela árvore de busca em largura, componente por componente: a cor da raiz é +1 e, ao descer pelo
   * laço u–v da árvore, cor(v) = cor(u)·s. Devolve as cores, a árvore (pai, profundidade, laço de cada vértice)
   * e os laços em conflito (os que a pintura contraria: cor(i)·cor(j) ≠ s). */
  function pinturaArvore(n, edges, raiz) {
    var viz = [], i; for (i = 0; i < n; i++) viz.push([]);
    edges.forEach(function (e, k) { viz[e[0]].push([e[1], k]); viz[e[1]].push([e[0], k]); });
    var cor = new Array(n).fill(0), pai = new Array(n).fill(-1), lacoPai = new Array(n).fill(-1), prof = new Array(n).fill(0), naArvore = edges.map(function () { return false; });
    var ordem = []; if (raiz != null) ordem.push(raiz); for (i = 0; i < n; i++) ordem.push(i);
    ordem.forEach(function (r) {
      if (cor[r]) return;
      cor[r] = 1; var fila = [r];
      while (fila.length) {
        var u = fila.shift();
        viz[u].forEach(function (vk) {
          var v = vk[0], k = vk[1];
          if (cor[v]) return;
          cor[v] = cor[u] * edges[k][2]; pai[v] = u; lacoPai[v] = k; prof[v] = prof[u] + 1; naArvore[k] = true; fila.push(v);
        });
      }
    });
    var conflitos = []; edges.forEach(function (e, k) { if (cor[e[0]] * cor[e[1]] !== e[2]) conflitos.push(k); });
    return { cor: cor, pai: pai, lacoPai: lacoPai, prof: prof, naArvore: naArvore, conflitos: conflitos };
  }
  /* o ciclo fundamental de um laço fora da árvore: caminho na árvore entre as pontas, mais o próprio laço */
  function cicloFundamental(T, e) {
    var a = e[0], b = e[1], ca = [a], cb = [b];
    while (a !== b) { if (T.prof[a] >= T.prof[b]) { a = T.pai[a]; ca.push(a); } else { b = T.pai[b]; cb.push(b); } }
    cb.pop(); return ca.concat(cb.reverse());     // vértices do ciclo, em ordem; o laço e fecha do último ao primeiro
  }
  /* um ciclo com número ímpar de laços negativos, o mais curto entre os ciclos fundamentais de todas as raízes;
   * null se a rede é equilibrada */
  function cicloImpar(n, edges) {
    var melhor = null;
    for (var r = 0; r < n; r++) {
      var T = pinturaArvore(n, edges, r);
      if (!T.conflitos.length) return null;
      T.conflitos.forEach(function (k) { var c = cicloFundamental(T, edges[k]); if (!melhor || c.length < melhor.length) melhor = c; });
    }
    return melhor;
  }
  function sinalEntre(edges, i, j) { for (var k = 0; k < edges.length; k++) { var e = edges[k]; if ((e[0] === i && e[1] === j) || (e[0] === j && e[1] === i)) return e[2]; } return 0; }
  /* índice de frustração: o menor número de laços que uma pintura em duas cores contraria (força bruta, n ≤ 20) */
  function frustracao(n, edges) {
    var melhor = Infinity, mcor = null, m, i;
    for (m = 0; m < (1 << (n - 1)); m++) {
      var f = 0;
      for (i = 0; i < edges.length; i++) {
        var e = edges[i], a = e[0] ? (m >> (e[0] - 1)) & 1 : 0, b = e[1] ? (m >> (e[1] - 1)) & 1 : 0;
        if ((a === b) !== (e[2] > 0)) { f++; if (f >= melhor) break; }
      }
      if (f < melhor) { melhor = f; mcor = m; }
    }
    var cor = []; for (i = 0; i < n; i++) cor.push(i && ((mcor >> (i - 1)) & 1) ? -1 : 1);
    return { indice: melhor, cor: cor };
  }
  /* triângulos e o produto dos sinais em cada um */
  function triangulos(n, edges) {
    var S = zeros(n), out = [], i, j, k;
    edges.forEach(function (e) { S[e[0]][e[1]] = S[e[1]][e[0]] = e[2]; });
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) if (S[i][j]) for (k = j + 1; k < n; k++) if (S[i][k] && S[j][k]) out.push({ v: [i, j, k], produto: S[i][j] * S[i][k] * S[j][k], negativos: [S[i][j], S[i][k], S[j][k]].filter(function (x) { return x < 0; }).length });
    return out;
  }

  /* Tribos Gahuku-Gama (Read, 1954): 16 tribos do planalto central da Nova Guiné; +1 aliança, −1 hostilidade.
   * Posições: Kamada–Kawai com distância 1 nos laços positivos e 2,2 nos negativos. */
  var GAMA_NOMES = ["GAVEV", "KOTUN", "OVE", "ALIKA", "NAGAM", "GAHUK", "MASIL", "UKUDZ", "NOTOH", "KOHIK", "GEHAM", "ASARO", "UHETO", "SEUVE", "NAGAD", "GAMA"];
  var GAMA_E = [[0,1,1],[0,2,-1],[0,3,-1],[0,4,-1],[0,5,-1],[0,11,-1],[0,14,1],[0,15,1],[1,2,-1],[1,4,-1],[1,5,-1],[1,8,-1],[1,9,-1],[1,14,1],[1,15,1],[2,3,1],[2,5,1],[2,6,1],[2,7,1],[3,7,1],[4,6,1],[4,8,1],[4,13,1],[4,14,-1],[4,15,-1],[5,6,1],[5,7,1],[5,8,-1],[5,10,1],[5,11,1],[5,12,-1],[5,15,-1],[6,7,1],[6,10,1],[6,11,1],[6,12,1],[7,10,1],[7,11,1],[7,13,-1],[8,9,1],[8,10,-1],[8,12,1],[8,14,-1],[9,10,-1],[9,12,1],[9,14,-1],[10,11,1],[10,12,-1],[10,14,-1],[10,15,-1],[11,13,-1],[11,14,-1],[11,15,-1],[12,13,1],[12,14,-1],[12,15,-1],[13,15,-1],[14,15,1]];
  var GAMA_P = [[0.806,0.528],[0.704,0.43],[0.501,0.724],[0.466,0.9],[0.401,0.338],[0.416,0.622],[0.335,0.518],[0.32,0.749],[0.183,0.23],[0.269,0.1],[0.189,0.578],[0.269,0.647],[0.299,0.304],[0.454,0.168],[0.697,0.285],[0.817,0.362]];
  function gama() { return { n: 16, edges: GAMA_E.map(function (e) { return e.slice(); }), pos: GAMA_P.map(function (p) { return p.slice(); }), nomes: GAMA_NOMES.slice() }; }

  /* pequenas redes com sinais para a demo */
  var SINAIS = {
    gama: { label: "Tribos Gahuku-Gama (16)", make: gama },
    faccoes: { label: "Duas facções (8)", make: function () {
      return { n: 8, edges: [[0,1,1],[1,2,1],[2,3,1],[0,2,1],[4,5,1],[5,6,1],[6,7,1],[4,6,1],[1,5,-1],[3,7,-1],[2,4,-1],[0,6,-1]],
               pos: [[0.15,0.2],[0.3,0.4],[0.15,0.6],[0.3,0.8],[0.85,0.2],[0.7,0.4],[0.85,0.6],[0.7,0.8]] }; } },
    triangulo: { label: "Triângulo", make: function () { return { n: 3, edges: [[0,1,1],[1,2,1],[0,2,1]], pos: [[0.5,0.15],[0.15,0.8],[0.85,0.8]] }; } },
    quadrado: { label: "Quadrado com diagonal", make: function () { return { n: 4, edges: [[0,1,1],[1,2,1],[2,3,1],[0,3,1],[0,2,1]], pos: [[0.2,0.2],[0.8,0.2],[0.8,0.8],[0.2,0.8]] }; } },
    ciclo5: { label: "Ciclo de 5", make: function () { var e = [], p = []; for (var i = 0; i < 5; i++) { var a = Math.PI / 2 - 2 * Math.PI * i / 5; p.push([0.5 + 0.38 * Math.cos(a), 0.52 - 0.38 * Math.sin(a)]); e.push([i, (i + 1) % 5, 1]); } return { n: 5, edges: e, pos: p }; } }
  };

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

  return { pinturaArvore: pinturaArvore, cicloFundamental: cicloFundamental, cicloImpar: cicloImpar, sinalEntre: sinalEntre, frustracao: frustracao,
           triangulos: triangulos, gama: gama, SINAIS: SINAIS,
           corte: corte, divide: divide, acertos: acertos, rng: rng, blocos: blocos, molas: molas, faccoes: faccoes,
           componentes: componentes, adjacency: adjacency, degrees: degrees, incidence: incidence, btb: btb, laplacian: laplacian, eigSym: eigSym,
           passo: passo, itera: itera, modos: modos, coefs: coefs, evolve: evolve,
           caminho: caminho, anel: anel, estrela: estrela, grade: grade, doisGrupos: doisGrupos, carate: carate,
           REDES: REDES, prepara: prepara };
});
