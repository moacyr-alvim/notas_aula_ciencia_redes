/* Demo da página "Molloy–Reed e o paradoxo da amizade".
 * Esquerda: p_k (grau de um vértice sorteado) e q_k = k p_k/⟨k⟩ (grau de quem está na ponta de um link sorteado).
 * Direita: o tamanho do maior pedaço conexo em redes do modelo de configuração, variando o parâmetro da família,
 * com a linha do critério de Molloy–Reed.  Depende de epi-core.js. */
(function () {
  "use strict";
  var E = window.EpiCore, root = document.getElementById("demo-mr");
  if (!E || !root) return;

  var $ = function (id) { return document.getElementById(id); };
  var sFam = $("m-fam"), rP = $("m-par"), oP = $("m-parv"), lP = $("m-parl"), bNova = $("m-nova"), read = $("m-readout"), cD = $("m-dist-canvas"), cG = $("m-gig-canvas");
  var N = 3000, PONTOS = 36, semente = 1, curva = null, raf = 0, timer = 0;

  var FAM = {
    poisson: { nome: "⟨k⟩", min: 0.2, max: 4, passo: 0.05, ini: 1.5, dist: function (x) { return E.poisson(x, 60); }, fmt: 2 },
    regular: { nome: "k", min: 1, max: 5, passo: 1, ini: 3, dist: function (x) { return E.regularDist(Math.round(x)); }, fmt: 0 },
    mistura: { nome: "fração a de grau 1", min: 0, max: 1, passo: 0.01, ini: 0.6, dist: function (x) { return E.doisGraus(x, 1, 3); }, fmt: 2 },
    potencia: { nome: "expoente γ", min: 2.1, max: 4.2, passo: 0.02, ini: 2.8, dist: function (x) { return E.leiPotencia(x, 1, 1000); }, fmt: 2 }
  };

  function fmt(x, d) { return x.toFixed(d == null ? 2 : d).replace(".", ",").replace("-", "−"); }
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function colors() { return { ink: css("--ink"), soft: css("--ink-soft"), rule: css("--rule"), carac: css("--carac"), choque: css("--choque"), paper: css("--paper") }; }
  function setup(canvas) {
    var dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    var ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }
  function fam() { return FAM[sFam.value]; }
  function gigante(x, s) { var g = E.configuracao(N, fam().dist(x), E.rng(s)); return E.maiorComponente(N, g.arestas); }
  /* o valor do parâmetro em que Σ k(k − 2) p_k troca de sinal (bisseção); null se não troca no intervalo */
  function limiar() {
    var F = fam(), a = F.min, b = F.max, fa = E.molloyReed(F.dist(a)), fb = E.molloyReed(F.dist(b));
    if (sFam.value === "regular") return 2;
    if (fa * fb > 0) return null;
    for (var j = 0; j < 60; j++) { var m = (a + b) / 2, fm = E.molloyReed(F.dist(m)); if (fm * fa > 0) { a = m; fa = fm; } else b = m; }
    return (a + b) / 2;
  }

  function montaCurva() {
    var F = fam(); curva = [];
    var xs = sFam.value === "regular" ? [1, 2, 3, 4, 5] : Array.from({ length: PONTOS }, function (_, j) { return F.min + (F.max - F.min) * j / (PONTOS - 1); });
    xs.forEach(function (x, j) { curva.push([x, gigante(x, semente * 1000 + j)]); });
    curva.lim = limiar();
  }
  function trocaFamilia() {
    var F = fam(); rP.min = F.min; rP.max = F.max; rP.step = F.passo; rP.value = F.ini; lP.textContent = F.nome;
    montaCurva(); schedule();
  }

  function drawDist(col, p) {
    var P = setup(cD), ctx = P.ctx, l = 40, r = 10, t = 16, b = 30, w = P.w - l - r, h = P.h - t - b, K = 12, q = E.pontaDeLink(p);
    var ymax = 0; for (var k = 0; k <= K; k++) ymax = Math.max(ymax, p[k] || 0, q[k] || 0); var passo = ymax > 0.45 ? 0.2 : 0.1; ymax = Math.min(1, Math.ceil(ymax / passo + 0.25) * passo);
    var bw = w / (K + 1), Y = function (v) { return t + (1 - v / ymax) * h; };
    ctx.font = "12px sans-serif"; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.lineWidth = 1; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (var v = 0; v <= ymax + 1e-9; v += passo) { var py = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(fmt(v), l - 6, py); }
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (k = 0; k <= K; k++) ctx.fillText(String(k), l + (k + 0.5) * bw, t + h + 6);
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("grau k", P.w - r, P.h - 2);
    for (k = 0; k <= K; k++) {
      var x0 = l + k * bw;
      ctx.fillStyle = col.carac; ctx.fillRect(x0 + bw * 0.12, Y(p[k] || 0), bw * 0.36, Y(0) - Y(p[k] || 0));
      ctx.fillStyle = col.choque; ctx.fillRect(x0 + bw * 0.52, Y(q[k] || 0), bw * 0.36, Y(0) - Y(q[k] || 0));
    }
    var m1 = E.momento(p, 1), kap = m1 ? E.momento(p, 2) / m1 : 0;
    [[m1, col.carac], [kap, col.choque]].forEach(function (mc) {
      if (mc[0] > K + 0.5) return;
      var x = l + (mc[0] + 0.5) * bw; ctx.strokeStyle = mc[1]; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x, t); ctx.lineTo(x, t + h); ctx.stroke(); ctx.setLineDash([]);
    });
  }
  function drawGig(col, x, gx) {
    var F = fam(), P = setup(cG), ctx = P.ctx, l = 40, r = 12, t = 16, b = 30, w = P.w - l - r, h = P.h - t - b;
    var X = function (v) { return l + (v - F.min) / (F.max - F.min) * w; }, Y = function (v) { return t + (1 - v) * h; };
    ctx.font = "12px sans-serif"; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.lineWidth = 1; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) { var py = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(fmt(v), l - 6, py); });
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (var j = 0; j <= 4; j++) { var v = F.min + (F.max - F.min) * j / 4, px = Math.round(X(v)) + 0.5; ctx.beginPath(); ctx.moveTo(px, t); ctx.lineTo(px, t + h); ctx.stroke(); ctx.fillText(fmt(v, F.fmt), px, t + h + 6); }
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(F.nome, P.w - r, P.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("maior pedaço conexo / n", l + 6, 0);
    if (curva.lim != null) { ctx.strokeStyle = col.ink; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(X(curva.lim), t); ctx.lineTo(X(curva.lim), t + h); ctx.stroke(); ctx.setLineDash([]); }
    ctx.strokeStyle = col.carac; ctx.fillStyle = col.carac; ctx.lineWidth = 2;
    ctx.beginPath(); curva.forEach(function (c, j) { if (j) ctx.lineTo(X(c[0]), Y(c[1])); else ctx.moveTo(X(c[0]), Y(c[1])); }); ctx.stroke();
    curva.forEach(function (c) { ctx.beginPath(); ctx.arc(X(c[0]), Y(c[1]), 2.5, 0, 6.2832); ctx.fill(); });
    ctx.fillStyle = col.choque; ctx.beginPath(); ctx.arc(X(x), Y(gx), 6, 0, 6.2832); ctx.fill();
  }

  function draw() {
    var F = fam(), x = parseFloat(rP.value), p = F.dist(x), col = colors(), m1 = E.momento(p, 1), m2 = E.momento(p, 2), kap = m1 ? m2 / m1 : 0, gx = gigante(x, semente * 7 + 3);
    oP.textContent = fmt(x, F.fmt);
    drawDist(col, p); drawGig(col, x, gx);
    read.innerHTML = "<span>grau médio de um vértice ⟨k⟩ = <b>" + fmt(m1) + "</b> · grau médio de quem está na ponta de um link ⟨k²⟩/⟨k⟩ = <b>" + fmt(kap) + "</b></span>" +
      "<span>saídas novas por vértice alcançado ⟨k²⟩/⟨k⟩ − 1 = <b>" + fmt(kap - 1) + "</b> → " + (kap > 2 + 1e-9 ? "<b>maior que 1: há pedaço gigante</b>" : kap > 2 - 1e-9 ? "<b>exatamente 1: no limiar</b>" : "<b>menor que 1: só pedaços pequenos</b>") + "</span>" +
      "<span>numa rede sorteada com n = " + N + ": maior pedaço com <b>" + fmt(100 * gx, 1) + "%</b> dos vértices" + (curva.lim != null && sFam.value !== "regular" ? " · limiar de Molloy–Reed em " + F.nome + " = <b>" + fmt(curva.lim, 2) + "</b>" : "") + "</span>";
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  sFam.addEventListener("change", trocaFamilia);
  rP.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(schedule, 30); });
  bNova.addEventListener("click", function () { semente++; montaCurva(); schedule(); });
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);
  trocaFamilia();
})();
