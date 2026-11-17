/* Demo da página "O modelo SIS clássico".
 * Esquerda: a população (uma grade de pessoas; no anel, a ordem da grade é a ordem do anel, linha por linha),
 * com as infectadas em vermelho no passo t. Direita: a fração de infectados em cada passo, em várias simulações,
 * a média delas e a equação de diferenças clássica. Em escala log, também a progressão geométrica i₀·rᵗ.
 * Depende de epi-core.js. */
(function () {
  "use strict";
  var E = window.EpiCore, root = document.getElementById("demo-sis");
  if (!E || !root) return;

  var $ = function (id) { return document.getElementById(id); };
  var sRede = $("e-rede"), rB = $("e-beta"), oB = $("e-betav"), rK = $("e-k"), oK = $("e-kv"), rM = $("e-mu"), oM = $("e-muv"),
      rT = $("e-t"), oT = $("e-tv"), btn = $("e-play"), bNova = $("e-nova"), cLog = $("e-log"), read = $("e-readout"),
      cP = $("e-pop-canvas"), cC = $("e-curva-canvas");
  var LADO = 40, N = LADO * LADO, T = 150, RUNS = 8, I0 = 16, semente = 1, sims = null, media = null, eq = null, t = 0,
      playing = false, lastTs = 0, acc = 0, raf = 0, timer = 0;

  function fmt(x, d) { return x.toFixed(d == null ? 2 : d).replace(".", ",").replace("-", "−"); }
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function colors() { return { ink: css("--ink"), soft: css("--ink-soft"), rule: css("--rule"), carac: css("--carac"), choque: css("--choque"), paper: css("--paper") }; }
  function setup(canvas) {
    var dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    var ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }
  function par() { return { beta: parseFloat(rB.value), k: parseInt(rK.value, 10), mu: parseFloat(rM.value) }; }

  /* ---------- modelo ---------- */
  function recalcula() {
    var p = par();
    sims = [];
    for (var s = 0; s < RUNS; s++) sims.push(E.simula({ n: N, k: p.k, beta: p.beta, mu: p.mu, T: T, rede: sRede.value, seed: semente * 101 + s, i0: I0, guardaEstados: s === 0 }));
    media = []; for (var j = 0; j <= T; j++) { var m = 0; sims.forEach(function (S) { m += S.frac[j]; }); media.push(m / RUNS); }
    eq = E.serie(E.passoClassico, I0 / N, p.beta, p.k, p.mu, T);
    schedule();
  }
  function agenda() { clearTimeout(timer); timer = setTimeout(recalcula, 60); oB.textContent = fmt(parseFloat(rB.value), 3); oK.textContent = rK.value; oM.textContent = fmt(parseFloat(rM.value), 2); }

  /* ---------- desenho ---------- */
  function drawPop(col) {
    var P = setup(cP), ctx = P.ctx, side = Math.min(P.w, P.h) - 16, cel = side / LADO, ox = (P.w - side) / 2, oy = (P.h - side) / 2, st = sims[0].estados[t];
    ctx.fillStyle = col.rule; ctx.globalAlpha = 0.35; ctx.fillRect(ox, oy, side, side); ctx.globalAlpha = 1;
    ctx.fillStyle = col.choque;
    for (var i = 0; i < N; i++) if (st[i]) ctx.fillRect(ox + (i % LADO) * cel + 0.5, oy + Math.floor(i / LADO) * cel + 0.5, cel - 1, cel - 1);
  }
  function drawCurva(col) {
    var P = setup(cC), ctx = P.ctx, l = 46, r = 12, tp = 16, b = 30, w = P.w - l - r, h = P.h - tp - b, lg = cLog.checked, p = par();
    var lo = -3, Y = lg ? function (v) { return tp + (0 - Math.max(lo, Math.log10(Math.max(v, 1e-6)))) / (0 - lo) * h; } : function (v) { return tp + (1 - v / 0.8) * h; };
    var X = function (tv) { return l + tv / T * w; };
    ctx.font = "12px sans-serif"; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.lineWidth = 1; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    (lg ? [1, 0.1, 0.01, 0.001] : [0, 0.2, 0.4, 0.6, 0.8]).forEach(function (v) { var py = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(String(v).replace(".", ","), l - 6, py); });
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (var tv = 0; tv <= T; tv += 25) { var px = Math.round(X(tv)) + 0.5; ctx.beginPath(); ctx.moveTo(px, tp); ctx.lineTo(px, tp + h); ctx.stroke(); ctx.fillText(String(tv), px, tp + h + 6); }
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("passo t", P.w - r, P.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(lg ? "fração de infectados (escala log)" : "fração de infectados", l + 6, 0);
    ctx.save(); ctx.beginPath(); ctx.rect(l, tp - 2, w, h + 4); ctx.clip(); ctx.lineJoin = "round";
    function linha(v, cor, lw, alpha, dash) {
      ctx.strokeStyle = cor; ctx.lineWidth = lw; ctx.globalAlpha = alpha; ctx.setLineDash(dash || []); ctx.beginPath();
      v.forEach(function (x, j) { if (j) ctx.lineTo(X(j), Y(x)); else ctx.moveTo(X(j), Y(x)); }); ctx.stroke(); ctx.globalAlpha = 1; ctx.setLineDash([]);
    }
    var R0 = p.beta * p.k / p.mu, istar = 1 - 1 / R0;
    if (R0 > 1) { ctx.strokeStyle = col.ink; ctx.setLineDash([2, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(l, Y(istar)); ctx.lineTo(l + w, Y(istar)); ctx.stroke(); ctx.setLineDash([]); }
    sims.forEach(function (S) { linha(S.frac, col.choque, 1, 0.35); });
    linha(media, col.choque, 2.6, 1);
    linha(eq, col.carac, 2.2, 1, [7, 4]);
    if (lg) { var r = 1 - p.mu + p.beta * p.k, g = []; for (var j = 0; j <= T; j++) g.push(I0 / N * Math.pow(r, j)); linha(g, col.ink, 1.2, 0.8, [3, 3]); }
    ctx.strokeStyle = col.ink; ctx.setLineDash([5, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(t), tp); ctx.lineTo(X(t), tp + h); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  function draw() {
    var col = colors(), p = par(), R0 = p.beta * p.k / p.mu, r = 1 - p.mu + p.beta * p.k, rm = E.razaoInicial(media, 0.03);
    oT.textContent = String(t);
    drawPop(col); drawCurva(col);
    var fim = media.slice(T - 20).reduce(function (a, x) { return a + x; }, 0) / 21;
    read.innerHTML = "<span>R₀ = β⟨k⟩/μ = <b>" + fmt(R0) + "</b> · razão prevista no começo r = 1 − μ + β⟨k⟩ = <b>" + fmt(r, 3) + "</b>" +
      (isNaN(rm) ? "" : " · medida nas simulações: <b>" + fmt(rm, 3) + "</b>") + "</span>" +
      "<span>equilíbrio previsto 1 − 1/R₀ = <b>" + (R0 > 1 ? fmt(1 - 1 / R0, 3) : "0 (a epidemia some)") + "</b> · nas simulações (últimos 20 passos): <b>" + fmt(fim, 3) + "</b></span>" +
      "<span>passo t = <b>" + t + "</b> · infectados agora (simulação desenhada): <b>" + fmt(sims[0].frac[t] * 100, 1) + "%</b></span>";
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  /* ---------- interação ---------- */
  [rB, rK, rM].forEach(function (x) { x.addEventListener("input", agenda); });
  sRede.addEventListener("change", function () {
    // no anel e na regular, k precisa ser par para o anel; arredonda
    if (sRede.value === "anel" && parseInt(rK.value, 10) % 2) rK.value = parseInt(rK.value, 10) + 1;
    agenda();
  });
  rK.addEventListener("change", function () { if (sRede.value === "anel" && parseInt(rK.value, 10) % 2) { rK.value = parseInt(rK.value, 10) + 1; agenda(); } });
  bNova.addEventListener("click", function () { semente++; recalcula(); });
  cLog.addEventListener("change", schedule);
  rT.addEventListener("input", function () { t = parseInt(rT.value, 10); schedule(); });
  btn.addEventListener("click", function () {
    playing = !playing; btn.textContent = playing ? "⏸ Pausar" : "▶ Animar";
    if (playing) { if (t >= T) { t = 0; rT.value = 0; } lastTs = 0; acc = t; requestAnimationFrame(tick); }
  });
  function tick(ts) {
    if (!playing) return;
    if (lastTs) { acc = Math.min(T, acc + (ts - lastTs) / 1000 * 18); var nt = Math.floor(acc); if (nt !== t) { t = nt; rT.value = t; draw(); } }
    lastTs = ts;
    if (t >= T) { playing = false; btn.textContent = "▶ Animar"; return; }
    requestAnimationFrame(tick);
  }
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);
  rT.max = T;
  agenda(); recalcula();
  window.DemoSIS = { estado: function () { return { media: media, eq: eq, sims: sims }; } };
})();
