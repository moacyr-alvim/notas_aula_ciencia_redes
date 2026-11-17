/* Núcleo das páginas de epidemiologia: o modelo SIS em tempo discreto.
 * Sem DOM: roda no navegador e no Node (testes).
 *
 * Um passo de tempo, para cada pessoa:
 *   infectada  → fica suscetível com probabilidade μ (recuperação), senão continua infectada;
 *   suscetível → é infectada se pelo menos um dos seus contatos infectados transmitir;
 *                cada contato infectado transmite, independentemente, com probabilidade β.
 * As transmissões do passo t são calculadas com os estados do passo t (atualização simultânea).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.EpiCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* gerador de números pseudoaleatórios com semente (mulberry32) */
  function rng(seed) {
    var t = seed >>> 0;
    return function () { t = (t + 0x6D2B79F5) >>> 0; var x = t; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }

  /* ---------- equações de diferenças (campo médio: todos se misturam) ---------- */
  /* forma clássica: i' = i + β⟨k⟩ i (1 − i) − μ i */
  function passoClassico(i, beta, k, mu) { return i + beta * k * i * (1 - i) - mu * i; }
  /* forma "exata" para quem tem k contatos sorteados a cada passo: i' = (1 − μ) i + (1 − i)(1 − (1 − β i)^k) */
  function passoExato(i, beta, k, mu) { return (1 - mu) * i + (1 - i) * (1 - Math.pow(1 - beta * i, k)); }
  function serie(passo, i0, beta, k, mu, T) { var out = [i0], i = i0; for (var t = 0; t < T; t++) { i = passo(i, beta, k, mu); out.push(i); } return out; }

  /* ---------- SIR: s, i, r (frações); quem se cura fica imune ---------- */
  function passoSIR(x, beta, k, mu) {
    var novos = beta * k * x[0] * x[1], cura = mu * x[1];
    return [x[0] - novos, x[1] + novos - cura, x[2] + cura];
  }
  function serieSIR(i0, beta, k, mu, T) { var x = [1 - i0, i0, 0], out = [x]; for (var t = 0; t < T; t++) { x = passoSIR(x, beta, k, mu); out.push(x); } return out; }

  /* ---------- redes de contatos (listas de vizinhos) ---------- */
  function erdosRenyi(n, k, R) {          // cada par ligado com probabilidade k/(n − 1)
    var p = k / (n - 1), viz = [], i, j;
    for (i = 0; i < n; i++) viz.push([]);
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) if (R() < p) { viz[i].push(j); viz[j].push(i); }
    return viz;
  }
  function regularAleatoria(n, k, R) {    // todos com grau k: pareamento ao acaso das "pontas" (modelo de configuração),
    var viz = [], tem = {}, sobra = [], i, c;  // refazendo só os pares ruins (laço num vértice só ou link repetido)
    var chave = function (a, b) { return a < b ? a + "," + b : b + "," + a; };
    var embaralha = function (v) { for (var i = v.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), x = v[i]; v[i] = v[j]; v[j] = x; } };
    for (i = 0; i < n; i++) { viz.push([]); for (c = 0; c < k; c++) sobra.push(i); }
    var liga = function (a, b) { tem[chave(a, b)] = 1; viz[a].push(b); viz[b].push(a); };
    var desliga = function (a, b) { delete tem[chave(a, b)]; viz[a].splice(viz[a].indexOf(b), 1); viz[b].splice(viz[b].indexOf(a), 1); };
    for (var rodada = 0; rodada < 50 && sobra.length; rodada++) {
      embaralha(sobra); var resto = [];
      for (i = 0; i + 1 < sobra.length; i += 2) { var a = sobra[i], b = sobra[i + 1]; if (a !== b && !tem[chave(a, b)]) liga(a, b); else resto.push(a, b); }
      sobra = resto;
    }
    // o que sobrou: troca com um link qualquer (a,b) + (c,d) → (a,c) + (b,d)
    for (var tent = 0; sobra.length && tent < 100000; tent++) {
      var x = sobra[0], y = sobra[1], c0 = Math.floor(R() * n);
      if (!viz[c0].length) continue;
      var d0 = viz[c0][Math.floor(R() * viz[c0].length)];
      if (x === c0 || y === d0 || x === y && false) continue;
      if (x !== c0 && y !== d0 && !tem[chave(x, c0)] && !tem[chave(y, d0)] && x !== y || (x === y && x !== c0 && x !== d0 && !tem[chave(x, c0)] && !tem[chave(x, d0)])) {
        desliga(c0, d0); liga(x, c0); liga(y, d0); sobra = sobra.slice(2);
      }
    }
    if (sobra.length) throw new Error("não consegui sortear a rede regular");
    return viz;
  }
  function anel(n, k) {                   // cada um ligado aos k/2 mais próximos de cada lado
    var viz = [], i, d;
    for (i = 0; i < n; i++) { viz.push([]); for (d = 1; d <= k / 2; d++) { viz[i].push((i + d) % n); viz[i].push((i - d + n) % n); } }
    return viz;
  }

  /* ---------- simulação ---------- */
  /* rede: "mistura" (k contatos novos sorteados a cada passo), "er", "regular", "anel".
   * Devolve a fração de infectados em cada passo, e os estados (para desenhar). */
  function simula(op) {
    var n = op.n, k = op.k, beta = op.beta, mu = op.mu, T = op.T, R = rng(op.seed || 1), viz = null;
    if (op.rede === "er") viz = erdosRenyi(n, k, R);
    else if (op.rede === "regular") viz = regularAleatoria(n, k, R);
    else if (op.rede === "anel") viz = anel(n, k);
    var I = new Uint8Array(n), i0 = op.i0 || 5, frac = [], estados = op.guardaEstados ? [] : null, i, c;
    if (op.rede === "anel") { for (i = 0; i < i0; i++) I[Math.floor(i * n / i0)] = 1; }   // focos espalhados pelo anel
    else { var esc = 0; while (esc < i0) { var v = Math.floor(R() * n); if (!I[v]) { I[v] = 1; esc++; } } }
    for (var t = 0; t <= T; t++) {
      var tot = 0; for (i = 0; i < n; i++) tot += I[i];
      frac.push(tot / n); if (estados) estados.push(I.slice());
      if (t === T) break;
      var J = new Uint8Array(n);
      for (i = 0; i < n; i++) {
        if (I[i]) { J[i] = R() < mu ? 0 : 1; continue; }
        var infectado = false;
        if (viz) { var vs = viz[i]; for (c = 0; c < vs.length && !infectado; c++) if (I[vs[c]] && R() < beta) infectado = true; }
        else { for (c = 0; c < k && !infectado; c++) { var u = Math.floor(R() * (n - 1)); if (u >= i) u++; if (I[u] && R() < beta) infectado = true; } }
        J[i] = infectado ? 1 : 0;
      }
      I = J;
    }
    var grau = viz ? viz.reduce(function (s, v) { return s + v.length; }, 0) / n : k;
    return { frac: frac, estados: estados, viz: viz, grauMedio: grau };
  }

  /* razão da progressão geométrica medida no começo: média geométrica de i_{t+1}/i_t enquanto i ≤ teto */
  function razaoInicial(frac, teto, minimo) {
    var t0 = 0, t1 = 0;
    while (t1 + 1 < frac.length && frac[t1 + 1] <= teto && frac[t1 + 1] > 0) t1++;
    if (t1 - t0 < (minimo || 3)) return NaN;
    return Math.pow(frac[t1] / frac[t0], 1 / (t1 - t0));
  }

  return { passoSIR: passoSIR, serieSIR: serieSIR,
           rng: rng, passoClassico: passoClassico, passoExato: passoExato, serie: serie,
           erdosRenyi: erdosRenyi, regularAleatoria: regularAleatoria, anel: anel, simula: simula, razaoInicial: razaoInicial };
});
