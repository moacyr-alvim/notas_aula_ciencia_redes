/* Demo da página "Frustração espectral".
 * Esquerda: um jogo. Clique nos vértices para trocá-los de cor e tente contrariar o menor número de laços;
 * botões mostram o que fazem o sinal de q₁, a busca local e a força bruta.
 * Direita: as opiniões de Altafini (u ← u − cLu) se apagando, em escala log, com a inclinação prevista por λ₁.
 * Depende de redes-core.js. */
(function () {
  "use strict";
  var K = window.RedesCore, root = document.getElementById("demo-frust");
  if (!K || !root) return;

  var $ = function (id) { return document.getElementById(id); };
  var sRede = $("fr-rede"), bQ = $("fr-q1"), bL = $("fr-local"), bO = $("fr-otima"), bS = $("fr-sorteia"),
      read = $("fr-readout"), hov = $("fr-hover"), cG = $("fr-rede-canvas"), cO = $("fr-op-canvas");
  var R = null, cor = null, melhorSeu = Infinity, hoverV = -1, semente = 11, raf = 0;
  var COR = ["#2a9d8f", "#c9a227"];

  function fmt(x, d) { return (Math.abs(x) < 5e-7 ? 0 : x).toFixed(d == null ? 3 : d).replace(".", ",").replace("-", "−"); }
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function colors() { return { ink: css("--ink"), soft: css("--ink-soft"), rule: css("--rule"), carac: css("--carac"), choque: css("--choque"), paper: css("--paper") }; }
  function setup(canvas) {
    var dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    var ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }
  function mix(a, b, f) {
    function p(h) { h = h.replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
    var A = p(a), B = p(b); if (A.some(isNaN) || B.some(isNaN)) return b;
    return "rgb(" + A.map(function (x, i) { return Math.round(x + (B[i] - x) * f); }).join(",") + ")";
  }
  function geom(P) {
    var pad = 18, side = Math.min(P.w, P.h) - 2 * pad, ox = (P.w - side) / 2, oy = (P.h - side) / 2;
    return { X: function (p) { return ox + p[0] * side; }, Y: function (p) { return oy + p[1] * side; }, r: R.nomes ? 8 : 12 };
  }
  function nome(i) { return R.nomes ? R.nomes[i] : String(i); }

  /* ---------- modelo ---------- */
  function carrega() {
    var g = K.FRUST[sRede.value].make();
    R = { n: g.n, edges: g.edges, pos: g.pos, nomes: g.nomes || null };
    var L = K.laplacianoSinais(R.n, R.edges), eig = K.eigSym(L);
    R.l1 = eig.values[0]; R.q1 = eig.vectors[0];
    R.l1n = K.eigSym(K.laplacianoSinaisNorm(R.n, R.edges)).values[0];
    var ot = K.frustracao(R.n, R.edges); R.f = ot.indice; R.otima = ot.cor;
    var dmax = Math.max.apply(null, L.map(function (r, i) { return r[i]; }));
    R.c = 0.9 / dmax;
    R.KMAX = Math.max(30, Math.min(400, Math.ceil(10 / (R.c * R.l1))));
    var r = K.rng(semente), u = []; for (var i = 0; i < R.n; i++) u.push(2 * r() - 1);
    R.est = K.itera(L, u, R.c, R.KMAX).map(function (v) { return Math.max.apply(null, v.map(Math.abs)); });
    cor = new Array(R.n).fill(1); melhorSeu = Infinity; hoverV = -1;
    marca(); schedule();
  }
  function marca() { var c = K.contrariados(R.edges, cor); if (c < melhorSeu) melhorSeu = c; }

  /* ---------- desenho ---------- */
  function drawRede(col) {
    var P = setup(cG), ctx = P.ctx, G = geom(P);
    ctx.lineCap = "round";
    R.edges.forEach(function (e) {
      var a = R.pos[e[0]], b = R.pos[e[1]], contra = cor[e[0]] * cor[e[1]] !== e[2];
      if (contra) { ctx.strokeStyle = col.ink; ctx.globalAlpha = 0.25; ctx.lineWidth = 8; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(G.X(a), G.Y(a)); ctx.lineTo(G.X(b), G.Y(b)); ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.strokeStyle = e[2] > 0 ? col.carac : col.choque; ctx.setLineDash(e[2] > 0 ? [] : [6, 4]); ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.moveTo(G.X(a), G.Y(a)); ctx.lineTo(G.X(b), G.Y(b)); ctx.stroke();
    });
    ctx.setLineDash([]); ctx.textBaseline = "middle";
    R.pos.forEach(function (p, i) {
      var x = G.X(p), y = G.Y(p);
      ctx.fillStyle = mix(col.paper, COR[cor[i] > 0 ? 0 : 1], 0.85); ctx.beginPath(); ctx.arc(x, y, G.r, 0, 6.2832); ctx.fill();
      ctx.lineWidth = i === hoverV ? 2.8 : 1.3; ctx.strokeStyle = i === hoverV ? col.ink : col.soft; ctx.beginPath(); ctx.arc(x, y, G.r, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = col.ink;
      if (R.nomes) { ctx.font = "11px sans-serif"; ctx.textAlign = p[0] > 0.6 ? "left" : "right"; ctx.fillText(nome(i), x + (p[0] > 0.6 ? 1 : -1) * (G.r + 4), y); }
      else { ctx.font = "11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(nome(i), x, y + 0.5); }
    });
  }
  function drawOp(col) {
    var P = setup(cO), ctx = P.ctx, l = 46, r = 12, t = 16, b = 30, w = P.w - l - r, h = P.h - t - b, KM = R.KMAX, lo = -6;
    var X = function (k) { return l + k / KM * w; }, Y = function (v) { return t + (0 - Math.max(lo, Math.log10(Math.max(v, 1e-12)))) / (0 - lo) * h; };
    ctx.font = "12px sans-serif"; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.lineWidth = 1; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (var e = 0; e >= lo; e--) { var py = Math.round(Y(Math.pow(10, e))) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(e === 0 ? "1" : "10" + ["", "⁻¹", "⁻²", "⁻³", "⁻⁴", "⁻⁵", "⁻⁶"][-e], l - 6, py); }
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    var st = Math.max(10, Math.round(KM / 4 / 10) * 10);
    for (var k = 0; k <= KM; k += st) { var px = Math.round(X(k)) + 0.5; ctx.beginPath(); ctx.moveTo(px, t); ctx.lineTo(px, t + h); ctx.stroke(); ctx.fillText(String(k), px, t + h + 6); }
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("passo k", P.w - r, P.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("maior |opinião| (escala log)", l + 6, 0);
    ctx.save(); ctx.beginPath(); ctx.rect(l, t - 2, w, h + 4); ctx.clip();
    // inclinação prevista por λ₁, encaixada no fim da curva
    var fim = R.est[KM], fator = 1 - R.c * R.l1;
    ctx.strokeStyle = col.ink; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.3; ctx.beginPath();
    for (k = 0; k <= KM; k++) { var v = fim * Math.pow(fator, k - KM); if (k) ctx.lineTo(X(k), Y(v)); else ctx.moveTo(X(k), Y(v)); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = col.choque; ctx.lineWidth = 2.5; ctx.beginPath();
    R.est.forEach(function (v2, k2) { if (k2) ctx.lineTo(X(k2), Y(v2)); else ctx.moveTo(X(k2), Y(v2)); });
    ctx.stroke(); ctx.restore();
  }

  function draw() {
    var col = colors(), c = K.contrariados(R.edges, cor), m = R.edges.length;
    drawRede(col); drawOp(col);
    read.innerHTML = "<span>sua divisão contraria <b>" + c + "</b>" + (c === 1 ? " laço" : " laços") + " · a melhor que você achou clicando: <b>" + melhorSeu + "</b> · ótimo: <b>f = " + R.f + "</b></span>" +
      "<span>λ₁ = <b>" + fmt(R.l1) + "</b> ≤ 4f/n = <b>" + fmt(4 * R.f / R.n) + "</b> · cota f ≥ nλ₁/4 = <b>" + fmt(R.n * R.l1 / 4, 2) + "</b></span>" +
      "<span>normalizado: λ̂₁ = <b>" + fmt(R.l1n) + "</b> ≤ 2f/m = <b>" + fmt(2 * R.f / m) + "</b></span>" +
      "<span>opiniões (c = 0,9/d̄_max): somem como (1 − cλ₁)ᵏ = " + fmt(1 - R.c * R.l1, 4) + "ᵏ; tempo de despolarização ≈ 1/(cλ₁) = <b>" + fmt(1 / (R.c * R.l1), 0) + "</b> passos</span>";
    hov.textContent = hoverV >= 0 ? nome(hoverV) + ": clique para trocar de cor" : "Clique nos vértices para trocá-los de cor. Os laços com sombra estão contrariados.";
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  /* ---------- interação ---------- */
  function vAt(ev) {
    var rect = cG.getBoundingClientRect(), x = ev.clientX - rect.left, y = ev.clientY - rect.top, G = geom({ w: cG.clientWidth, h: cG.clientHeight }), best = -1, bd = Infinity;
    R.pos.forEach(function (p, i) { var d = Math.hypot(G.X(p) - x, G.Y(p) - y); if (d < bd) { bd = d; best = i; } });
    return bd <= G.r + 4 ? best : -1;
  }
  cG.addEventListener("mousemove", function (ev) { var i = vAt(ev); cG.style.cursor = i >= 0 ? "pointer" : "default"; if (i !== hoverV) { hoverV = i; schedule(); } });
  cG.addEventListener("mouseleave", function () { hoverV = -1; schedule(); });
  cG.addEventListener("click", function (ev) { var i = vAt(ev); if (i >= 0) { cor[i] = -cor[i]; marca(); schedule(); } });
  bQ.addEventListener("click", function () { cor = R.q1.map(function (x) { return x >= 0 ? 1 : -1; }); schedule(); });
  bL.addEventListener("click", function () { cor = K.buscaLocal(R.n, R.edges, cor); schedule(); });
  bO.addEventListener("click", function () { cor = R.otima.slice(); schedule(); });
  bS.addEventListener("click", function () { var r = K.rng(semente = (semente * 7919 + 3) % 100003); cor = cor.map(function () { return r() < 0.5 ? 1 : -1; }); marca(); schedule(); });
  sRede.addEventListener("change", carrega);
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);

  Object.keys(K.FRUST).forEach(function (id) { var o = document.createElement("option"); o.value = id; o.textContent = K.FRUST[id].label; sRede.appendChild(o); });
  sRede.value = "gama";
  carrega();
})();
