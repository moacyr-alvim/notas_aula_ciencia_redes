/* Demo da página "Laplaciano, componentes e gargalos": clique num laço para cortá-lo (ou religá-lo) e veja o espectro de L.
 * Esquerda: a rede. Se é conexa, os vértices são coloridos pelo vetor de Fiedler q₂ (azul > 0, vermelho < 0);
 * se está partida, cada componente ganha uma cor.  Direita: os n autovalores de L em ordem.  Depende de redes-core.js. */
(function () {
  "use strict";
  var K = window.RedesCore, root = document.getElementById("demo-corte");
  if (!K || !root) return;

  var $ = function (id) { return document.getElementById(id); };
  var sRede = $("g-rede"), bRest = $("g-restaura"), read = $("g-readout"), hov = $("g-hover"),
      cG = $("g-rede-canvas"), cE = $("g-esp-canvas");

  var base = null, cortado = [], hoverE = -1, hoverV = -1, atual = null, raf = 0;
  var EXTRA = ["#2a9d8f", "#c9a227", "#8e5ccf", "#6b7a8f", "#d0679d", "#4f8f3a"];

  function fmt(x, d) { return x.toFixed(d == null ? 3 : d).replace(".", ",").replace("-", "−"); }
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
    var pad = 16, side = Math.min(P.w, P.h) - 2 * pad, ox = (P.w - side) / 2, oy = (P.h - side) / 2;
    return { X: function (p) { return ox + p[0] * side; }, Y: function (p) { return oy + p[1] * side; },
             r: base.n > 20 ? Math.max(7, Math.min(11, side / 34)) : Math.max(9, Math.min(15, side / 22)) };
  }

  /* ---------- modelo ---------- */
  function carrega() {
    base = K.prepara(sRede.value);
    cortado = base.edges.map(function () { return false; });
    hoverE = hoverV = -1; recalcula();
  }
  function recalcula() {
    var e = base.edges.filter(function (_, i) { return !cortado[i]; });
    var L = K.laplacian(base.n, e), eig = K.eigSym(L), comp = K.componentes(base.n, e);
    var ncomp = Math.max.apply(null, comp) + 1, nulos = eig.values.filter(function (x) { return x === 0; }).length;
    var d = K.degrees(K.adjacency(base.n, e)), dmax = Math.max.apply(null, d);
    var q = eig.vectors[1].slice(), s = 0; q.forEach(function (x, i) { s += x * (i + 1); }); if (s < 0) q = q.map(function (x) { return -x; });
    atual = { edges: e, eig: eig, comp: comp, ncomp: ncomp, nulos: nulos, graus: d, dmax: dmax, q: q,
              qmax: Math.max.apply(null, q.map(Math.abs)) || 1 };
    schedule();
  }

  /* ---------- desenho ---------- */
  function corComp(c, col) { return c === 0 ? col.carac : c === 1 ? col.choque : EXTRA[(c - 2) % EXTRA.length]; }
  function drawRede(col) {
    var P = setup(cG), ctx = P.ctx, G = geom(P), A = atual;
    ctx.lineCap = "round";
    base.edges.forEach(function (e, i) {
      var a = base.pos[e[0]], b = base.pos[e[1]];
      ctx.setLineDash(cortado[i] ? [3, 5] : []);
      ctx.strokeStyle = i === hoverE ? col.ink : col.rule;
      ctx.globalAlpha = cortado[i] && i !== hoverE ? 0.55 : 1;
      ctx.lineWidth = i === hoverE ? 3.2 : cortado[i] ? 1 : 1.6;
      ctx.beginPath(); ctx.moveTo(G.X(a), G.Y(a)); ctx.lineTo(G.X(b), G.Y(b)); ctx.stroke();
    });
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.font = (G.r < 10 ? 9 : 11) + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    base.pos.forEach(function (p, i) {
      var x = G.X(p), y = G.Y(p), fill;
      if (A.ncomp > 1) fill = mix(col.paper, corComp(A.comp[i], col), 0.55);
      else { var v = A.q[i] / A.qmax; fill = mix(col.paper, v >= 0 ? col.carac : col.choque, Math.min(1, 0.15 + 0.75 * Math.abs(v))); }
      ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, G.r, 0, 6.2832); ctx.fill();
      ctx.lineWidth = i === hoverV ? 2.6 : 1.4; ctx.strokeStyle = i === hoverV ? col.ink : col.soft;
      ctx.beginPath(); ctx.arc(x, y, G.r, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = col.ink; ctx.fillText(String(i), x, y + 0.5);
    });
  }

  function drawEspectro(col) {
    var P = setup(cE), ctx = P.ctx, l = 40, r = 12, t = 18, b = 30, w = P.w - l - r, h = P.h - t - b, A = atual, n = base.n;
    var ymax = Math.ceil(base.lambdaMax), Y = function (v) { return t + (1 - v / ymax) * h; }, bw = w / n;
    ctx.font = "12px sans-serif"; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.lineWidth = 1;
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    var st = ymax <= 5 ? 1 : ymax <= 12 ? 2 : 5;
    for (var v = 0; v <= ymax + 1e-9; v += st) { var py = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(String(v), l - 6, py); }
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    (n > 15 ? [1, n] : [1, 2, n]).forEach(function (j) { ctx.fillText(String(j), l + (j - 0.5) * bw, t + h + 6); });
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("j (em ordem crescente)", P.w - r, P.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("autovalores λⱼ de L", l + 6, 0);
    A.eig.values.forEach(function (lam, j) {
      var x = l + j * bw + bw * 0.15, ww = Math.max(1, bw * 0.7);
      if (lam === 0) { ctx.fillStyle = col.choque; ctx.beginPath(); ctx.arc(l + (j + 0.5) * bw, Y(0) - 4, Math.min(5, bw * 0.4), 0, 6.2832); ctx.fill(); return; }
      ctx.fillStyle = j === 1 ? col.carac : col.soft; ctx.globalAlpha = j === 1 ? 1 : 0.55;
      ctx.fillRect(x, Y(lam), ww, Y(0) - Y(lam)); ctx.globalAlpha = 1;
    });
    // rótulo de λ₂
    var l2 = A.eig.values[1], xl = l + 1.5 * bw;
    ctx.fillStyle = l2 === 0 ? col.choque : col.carac; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.fillText("λ₂ = " + fmt(l2), Math.min(xl + 4, l + w - 80), Math.min(Y(l2), Y(0) - 10) - 4);
  }

  function draw() {
    var col = colors(), A = atual, nc = cortado.filter(Boolean).length, l2 = A.eig.values[1], c = 0.9 / Math.max(1, A.dmax);
    drawRede(col); drawEspectro(col);
    read.innerHTML = "<span>laços cortados: <b>" + nc + "</b> de " + base.edges.length + "</span>" +
      "<span>componentes: <b>" + A.ncomp + "</b> · autovalores nulos: <b>" + A.nulos + "</b></span>" +
      "<span>λ₂ = <b>" + fmt(l2) + "</b> (rede inteira: " + fmt(base.lambda2) + ")</span>" +
      "<span>" + (l2 === 0 ? "rede partida: <b>nunca</b> chega à média geral" : "passos até o equilíbrio ≈ 1/(cλ₂) = <b>" + fmt(1 / (c * l2), 1) + "</b> (c = 0,9/d_max)") + "</span>";
    if (hoverE >= 0) { var e = base.edges[hoverE]; hov.textContent = "laço " + e[0] + "–" + e[1] + ": clique para " + (cortado[hoverE] ? "religar" : "cortar") + "."; }
    else if (hoverV >= 0) hov.textContent = "vértice " + hoverV + " (grau " + A.graus[hoverV] + ")" + (A.ncomp > 1 ? ", componente " + (A.comp[hoverV] + 1) : ", q₂ = " + fmt(A.q[hoverV]));
    else hov.textContent = "Clique num laço para cortá-lo; clique de novo para religar.";
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  /* ---------- interação ---------- */
  function alvo(ev) {
    var rect = cG.getBoundingClientRect(), x = ev.clientX - rect.left, y = ev.clientY - rect.top,
        G = geom({ w: cG.clientWidth, h: cG.clientHeight }), vi = -1, vd = Infinity, ei = -1, ed = Infinity;
    base.pos.forEach(function (p, i) { var d = Math.hypot(G.X(p) - x, G.Y(p) - y); if (d < vd) { vd = d; vi = i; } });
    if (vd <= G.r + 2) return { v: vi, e: -1 };
    base.edges.forEach(function (e, i) {
      var ax = G.X(base.pos[e[0]]), ay = G.Y(base.pos[e[0]]), bx = G.X(base.pos[e[1]]), by = G.Y(base.pos[e[1]]);
      var dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, s = L2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)) : 0;
      var d = Math.hypot(ax + s * dx - x, ay + s * dy - y); if (d < ed) { ed = d; ei = i; }
    });
    return { v: -1, e: ed <= 7 ? ei : -1 };
  }
  cG.addEventListener("mousemove", function (ev) {
    var a = alvo(ev); cG.style.cursor = a.e >= 0 ? "pointer" : "default";
    if (a.e !== hoverE || a.v !== hoverV) { hoverE = a.e; hoverV = a.v; schedule(); }
  });
  cG.addEventListener("mouseleave", function () { hoverE = hoverV = -1; schedule(); });
  cG.addEventListener("click", function (ev) { var a = alvo(ev); if (a.e >= 0) { cortado[a.e] = !cortado[a.e]; recalcula(); } });
  sRede.addEventListener("change", carrega);
  bRest.addEventListener("click", function () { cortado = cortado.map(function () { return false; }); recalcula(); });
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);

  ["carate", "grupos", "anel", "grade", "caminho", "estrela"].forEach(function (id) {
    var o = document.createElement("option"); o.value = id; o.textContent = K.REDES[id].label; sRede.appendChild(o);
  });
  sRede.value = "carate";
  carrega();

  // para os testes e para quem quiser brincar no console
  window.DemoCorte = { corta: function (i) { cortado[i] = true; recalcula(); }, estado: function () { return atual; } };
})();
