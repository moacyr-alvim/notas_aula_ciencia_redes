/* Demo da página "Difusão em redes": a quantidade começa toda num vértice e se espalha por u' = −L u (c = 1).
 * Esquerda: a rede, colorida por u. Direita: as curvas u_i(t).  Depende de redes-core.js. */
(function () {
  "use strict";
  var K = window.RedesCore, root = document.getElementById("demo-difusao");
  if (!K || !root) return;

  var $ = function (id) { return document.getElementById(id); };
  var sRede = $("d-rede"), sFonte = $("d-fonte"), rT = $("d-t"), oT = $("d-tv"), btn = $("d-play"), cLin = $("d-lin"),
      read = $("d-readout"), hov = $("d-hover"), cG = $("d-rede-canvas"), cC = $("d-curvas-canvas");

  var C = 1, NS = 240, M = null, fonte = 0, s = 0, hover = -1, playing = false, lastTs = 0, raf = 0, curves = null, coef = null, TS = null;

  /* ---------- utilidades ---------- */
  function fmt(x, d) { return x.toFixed(d == null ? 2 : d).replace(".", ",").replace("-", "−"); }
  function fmtT(x) { return x >= 10 ? fmt(x, 1) : x >= 0.1 || x === 0 ? fmt(x, 2) : fmt(x, 3); }
  function fmtTick(x) { return String(+x.toPrecision(3)).replace(".", ","); }
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
  /* Escalas. Padrão: tempo em escala log (de tmax/1000 a tmax) e u em escala de raiz, porque a ação se passa
   * em escalas muito diferentes (≈ 1/grau no começo, ≈ 1/λ₂ no fim) e os valores ficam perto de 1/n.
   * Com "escalas lineares": tempo linear (o controle anda como s², devagar no começo) e u linear. */
  function lin() { return cLin.checked; }
  function tmin() { return M.tmax / 1000; }
  function tOf(v) { return lin() ? M.tmax * v * v : v <= 0 ? 0 : tmin() * Math.pow(1000, v); }
  function tempo() { return tOf(s); }
  function xFrac(tv) { return lin() ? tv / M.tmax : Math.max(0, Math.log10(Math.max(tv, tmin()) / tmin()) / 3); }
  function yFrac(v) { v = Math.max(0, v); return lin() ? v : Math.sqrt(v); }
  function geom(P) {                                    // área útil do desenho da rede
    var pad = 16, side = Math.min(P.w, P.h) - 2 * pad, ox = (P.w - side) / 2, oy = (P.h - side) / 2;
    return { X: function (p) { return ox + p[0] * side; }, Y: function (p) { return oy + p[1] * side; },
             r: M.n > 20 ? Math.max(7, Math.min(11, side / 34)) : Math.max(9, Math.min(15, side / 22)) };
  }

  /* ---------- modelo ---------- */
  function carregaRede() {
    M = K.prepara(sRede.value);
    sFonte.textContent = "";
    for (var i = 0; i < M.n; i++) { var o = document.createElement("option"); o.value = i; o.textContent = "vértice " + i + " (grau " + M.graus[i] + ")"; sFonte.appendChild(o); }
    hover = -1; escolheFonte(M.fonte);
  }
  function escolheFonte(i) {
    fonte = i; sFonte.value = String(i);
    var u0 = new Array(M.n).fill(0); u0[i] = 1;
    coef = K.coefs(M.eig, u0);
    amostra(); setS(0); schedule();
  }
  function amostra() {
    TS = []; curves = [];
    for (var j = 0; j <= NS; j++) {   // na escala log as curvas começam em tmin (t = 0 não cabe no eixo)
      var tv = lin() ? tOf(j / NS) : tmin() * Math.pow(1000, j / NS);
      TS.push(tv); curves.push(K.evolve(M.eig, coef, C, tv));
    }
  }

  /* ---------- desenho ---------- */
  function drawRede(u, col) {
    var P = setup(cG), ctx = P.ctx, G = geom(P);
    ctx.lineCap = "round"; ctx.strokeStyle = col.rule; ctx.lineWidth = 1.4;
    M.edges.forEach(function (e) {
      var a = M.pos[e[0]], b = M.pos[e[1]];
      ctx.beginPath(); ctx.moveTo(G.X(a), G.Y(a)); ctx.lineTo(G.X(b), G.Y(b)); ctx.stroke();
    });
    ctx.font = (G.r < 10 ? 9 : 11) + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    M.pos.forEach(function (p, i) {
      var f = Math.pow(Math.min(1, Math.max(0, u[i])), 1 / 3), x = G.X(p), y = G.Y(p);
      ctx.fillStyle = mix(col.paper, col.choque, f); ctx.beginPath(); ctx.arc(x, y, G.r, 0, 6.2832); ctx.fill();
      ctx.lineWidth = i === fonte ? 3 : i === hover ? 2.6 : 1.4;
      ctx.strokeStyle = i === hover ? col.carac : i === fonte ? col.ink : col.soft;
      ctx.beginPath(); ctx.arc(x, y, G.r, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = col.ink; ctx.fillText(String(i), x, y + 0.5);
    });
  }

  function drawCurvas(col) {
    var P = setup(cC), ctx = P.ctx, l = 40, r = 12, t = 14, b = 30, w = P.w - l - r, h = P.h - t - b, tt = tempo();
    var X = function (tv) { return l + xFrac(tv) * w; }, Y = function (v) { return t + (1 - yFrac(v)) * h; };
    ctx.font = "12px sans-serif"; ctx.lineWidth = 1; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft;
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    (lin() ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.01, 0.05, 0.1, 0.25, 0.5, 1]).forEach(function (v) {
      var py = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(fmtTick(v), l - 6, py);
    });
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    var ticks = [];
    if (lin()) { var st = niceStep(M.tmax / 4); for (var tv = 0; tv <= M.tmax + 1e-9; tv += st) ticks.push(tv); }
    else { for (var e = Math.ceil(Math.log10(tmin()) - 1e-9); Math.pow(10, e) <= M.tmax * (1 + 1e-9); e++) ticks.push(Math.pow(10, e)); }
    ticks.forEach(function (tv) { var px = Math.round(X(tv)) + 0.5; ctx.beginPath(); ctx.moveTo(px, t); ctx.lineTo(px, t + h); ctx.stroke(); ctx.fillText(fmtTick(tv), px, t + h + 6); });
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(lin() ? "t" : "t (escala log)", P.w - r, P.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(lin() ? "uᵢ(t)" : "uᵢ(t)  (escala de raiz)", l + 6, 0);

    ctx.save(); ctx.beginPath(); ctx.rect(l, t - 2, w, h + 4); ctx.clip(); ctx.lineJoin = "round";
    // média
    ctx.strokeStyle = col.ink; ctx.setLineDash([2, 4]); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(l, Y(1 / M.n)); ctx.lineTo(l + w, Y(1 / M.n)); ctx.stroke(); ctx.setLineDash([]);
    function curva(i, cor, lw, alpha) {
      ctx.strokeStyle = cor; ctx.lineWidth = lw; ctx.globalAlpha = alpha; ctx.beginPath();
      for (var j = 0; j <= NS; j++) { var x = X(TS[j]), y = Y(curves[j][i]); if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    for (var i = 0; i < M.n; i++) if (i !== fonte && i !== hover) curva(i, col.soft, 1.1, 0.5);
    if (hover >= 0 && hover !== fonte) curva(hover, col.carac, 2.6, 1);
    curva(fonte, col.choque, 3, 1);
    // instante atual
    ctx.strokeStyle = col.ink; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2;
    var xs = X(tt); ctx.beginPath(); ctx.moveTo(xs, t); ctx.lineTo(xs, t + h); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  function niceStep(x) { var m = Math.pow(10, Math.floor(Math.log10(x))), f = x / m; return (f < 1.5 ? 1 : f < 3.5 ? 2.5 : f < 7.5 ? 5 : 10) * m; }

  function draw() {
    var col = colors(), tt = tempo(), u = K.evolve(M.eig, coef, C, tt), mx = -Infinity, mn = Infinity, soma = 0;
    u.forEach(function (x) { mx = Math.max(mx, x); mn = Math.min(mn, x); soma += x; });
    oT.textContent = fmtT(tt);
    drawRede(u, col); drawCurvas(col);
    read.innerHTML = "<span>t = <b>" + fmtT(tt) + "</b></span>" +
      "<span>soma de u: <b>" + fmt(soma, 3) + "</b></span>" +
      "<span>maior valor: <b>" + fmt(mx, 3) + "</b> · menor: <b>" + fmt(Math.max(0, mn), 3) + "</b> · média 1/n = <b>" + fmt(1 / M.n, 3) + "</b></span>" +
      "<span>λ₂ = <b>" + fmt(M.lambda2, 3) + "</b> · 1/λ₂ ≈ <b>" + fmtT(1 / M.lambda2) + "</b></span>";
    hov.textContent = hover >= 0
      ? "vértice " + hover + " (grau " + M.graus[hover] + "): u = " + fmt(Math.max(0, u[hover]), 3) + (hover === fonte ? " — é o vértice inicial" : "")
      : "Clique em um vértice para pôr nele toda a quantidade.";
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  /* ---------- interação ---------- */
  function setS(v) { s = Math.min(1, Math.max(0, v)); rT.value = s; }
  function nodeAt(ev) {
    var rect = cG.getBoundingClientRect(), x = ev.clientX - rect.left, y = ev.clientY - rect.top,
        G = geom({ w: cG.clientWidth, h: cG.clientHeight }), best = -1, bd = Infinity;
    M.pos.forEach(function (p, i) { var d = Math.hypot(G.X(p) - x, G.Y(p) - y); if (d < bd) { bd = d; best = i; } });
    return bd <= G.r + 6 ? best : -1;
  }
  cG.addEventListener("mousemove", function (ev) { var i = nodeAt(ev); cG.style.cursor = i >= 0 ? "pointer" : "default"; if (i !== hover) { hover = i; schedule(); } });
  cG.addEventListener("mouseleave", function () { if (hover !== -1) { hover = -1; schedule(); } });
  cG.addEventListener("click", function (ev) { var i = nodeAt(ev); if (i >= 0) { escolheFonte(i); hover = i; } });

  sRede.addEventListener("change", carregaRede);
  cLin.addEventListener("change", function () { var tt = tempo(); amostra();   // mantém o instante ao trocar de escala
    setS(tt <= 0 ? 0 : lin() ? Math.sqrt(tt / M.tmax) : Math.log10(tt / tmin()) / 3); schedule(); });
  sFonte.addEventListener("change", function () { escolheFonte(parseInt(sFonte.value, 10)); });
  rT.addEventListener("input", function () { s = parseFloat(rT.value); schedule(); });
  btn.addEventListener("click", function () {
    playing = !playing; btn.textContent = playing ? "⏸ Pausar" : "▶ Animar";
    if (playing) { if (s >= 1 - 1e-6) setS(0); lastTs = 0; requestAnimationFrame(tick); }
  });
  function tick(ts) {
    if (!playing) return;
    if (lastTs) setS(s + (ts - lastTs) / 1000 / 7);     // ~7 s do começo ao fim
    lastTs = ts; draw();
    if (s >= 1 - 1e-6) { playing = false; btn.textContent = "▶ Animar"; return; }
    requestAnimationFrame(tick);
  }
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);

  Object.keys(K.REDES).forEach(function (id) { var o = document.createElement("option"); o.value = id; o.textContent = K.REDES[id].label; sRede.appendChild(o); });
  sRede.value = "carate";
  carregaRede();
})();
