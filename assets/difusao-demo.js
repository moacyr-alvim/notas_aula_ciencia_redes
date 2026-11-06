/* Demo da página "Difusão em redes": a quantidade começa toda num vértice e se espalha em passos,
 * u_{k+1} = u_k − c L u_k  (método de Euler com Δt = 1).
 * Esquerda: a rede, colorida por u. Direita: as curvas u_i(k).  Depende de redes-core.js. */
(function () {
  "use strict";
  var K = window.RedesCore, root = document.getElementById("demo-difusao");
  if (!K || !root) return;

  var $ = function (id) { return document.getElementById(id); };
  var sRede = $("d-rede"), sFonte = $("d-fonte"), rC = $("d-c"), oC = $("d-cv"), rK = $("d-k"), oK = $("d-kv"),
      btn = $("d-play"), cLin = $("d-lin"), read = $("d-readout"), hov = $("d-hover"), cG = $("d-rede-canvas"), cC = $("d-curvas-canvas");

  var M = null, fonte = 0, c = 0, KMAX = 10, k = 0, hover = -1, playing = false, lastTs = 0, acc = 0, raf = 0, est = null;

  /* ---------- utilidades ---------- */
  function fmt(x, d) { return x.toFixed(d == null ? 2 : d).replace(".", ",").replace("-", "−"); }
  function fmtTick(x) { return String(+x.toPrecision(3)).replace(".", ",").replace("-", "−"); }
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
             r: M.n > 20 ? Math.max(7, Math.min(11, side / 34)) : Math.max(9, Math.min(15, side / 22)) };
  }
  /* Escalas. Padrão: passos em escala log (de 1 + k) e u em escala de raiz (com sinal), porque o começo é rápido
   * e os valores ficam perto de 1/n. Com "escalas lineares", as duas são lineares. */
  function lin() { return cLin.checked; }
  function xFrac(kv) { return lin() ? kv / KMAX : Math.log(1 + kv) / Math.log(1 + KMAX); }
  function ySig(v) { return lin() ? v : (v < 0 ? -1 : 1) * Math.sqrt(Math.abs(v)); }
  function instavel() { return c * M.lambdaMax > 2 + 1e-12; }
  function negativos() { return est.some(function (u) { return u.some(function (x) { return x < -1e-12; }); }); }

  /* ---------- modelo ---------- */
  function carregaRede() {
    M = K.prepara(sRede.value);
    sFonte.textContent = "";
    for (var i = 0; i < M.n; i++) { var o = document.createElement("option"); o.value = i; o.textContent = "vértice " + i + " (grau " + M.graus[i] + ")"; sFonte.appendChild(o); }
    hover = -1; fonte = M.fonte; sFonte.value = String(fonte);
    recalcula(0);
  }
  function recalcula(frac) {
    c = parseFloat(rC.value) / M.dmax;
    // passos suficientes para chegar perto do equilíbrio: ~5 vezes 1/(c λ₂), entre 10 e 300
    KMAX = Math.max(10, Math.min(300, Math.ceil(5 / (c * M.lambda2))));
    var u0 = new Array(M.n).fill(0); u0[fonte] = 1;
    est = K.itera(M.L, u0, c, KMAX);
    rK.max = KMAX; setK(Math.round(frac * KMAX)); schedule();
  }
  function escolheFonte(i) { fonte = i; sFonte.value = String(i); recalcula(0); }

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
      var v = u[i], f = Math.pow(Math.min(1, Math.abs(v)), 1 / 3), x = G.X(p), y = G.Y(p);
      ctx.fillStyle = mix(col.paper, v < 0 ? col.carac : col.choque, f); ctx.beginPath(); ctx.arc(x, y, G.r, 0, 6.2832); ctx.fill();
      ctx.lineWidth = i === fonte ? 3 : i === hover ? 2.6 : 1.4;
      ctx.strokeStyle = i === hover ? col.carac : i === fonte ? col.ink : col.soft;
      ctx.beginPath(); ctx.arc(x, y, G.r, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = col.ink; ctx.fillText(String(i), x, y + 0.5);
    });
  }

  function drawCurvas(col) {
    var P = setup(cC), ctx = P.ctx, l = 40, r = 12, t = 14, b = 30, w = P.w - l - r, h = P.h - t - b;
    var neg = negativos(), ylo = neg ? -1 : 0, yhi = 1;
    var X = function (kv) { return l + xFrac(kv) * w; },
        Y = function (v) { return t + (yhi - ySig(v)) / (yhi - ySig(ylo)) * h; };
    ctx.font = "12px sans-serif"; ctx.lineWidth = 1; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft;
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    var yt = lin() ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.01, 0.05, 0.1, 0.25, 0.5, 1];
    if (neg) yt = lin() ? [-1, -0.5, 0, 0.5, 1] : [-1, -0.25, -0.05, 0, 0.05, 0.25, 1];
    yt.forEach(function (v) { var py = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(fmtTick(v), l - 6, py); });
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    var ticks = [];
    if (lin()) { var st = niceStep(KMAX / 4); for (var kv = 0; kv <= KMAX; kv += st) ticks.push(kv); }
    else { ticks = [0, 1, 3, 10, 30, 100, 300].filter(function (x) { return x <= KMAX; }); }
    ticks.forEach(function (kv) { var px = Math.round(X(kv)) + 0.5; ctx.beginPath(); ctx.moveTo(px, t); ctx.lineTo(px, t + h); ctx.stroke(); ctx.fillText(fmtTick(kv), px, t + h + 6); });
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(lin() ? "passo k" : "passo k (escala log)", P.w - r, P.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(lin() ? "uᵢ" : "uᵢ  (escala de raiz)", l + 6, 0);

    ctx.save(); ctx.beginPath(); ctx.rect(l, t - 2, w, h + 4); ctx.clip(); ctx.lineJoin = "round";
    ctx.strokeStyle = col.ink; ctx.setLineDash([2, 4]); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(l, Y(1 / M.n)); ctx.lineTo(l + w, Y(1 / M.n)); ctx.stroke(); ctx.setLineDash([]);
    var dots = KMAX <= 40;
    function curva(i, cor, lw, alpha) {
      ctx.strokeStyle = cor; ctx.fillStyle = cor; ctx.lineWidth = lw; ctx.globalAlpha = alpha; ctx.beginPath();
      for (var j = 0; j <= KMAX; j++) { var x = X(j), y = Y(Math.max(-1.5, Math.min(1.5, est[j][i]))); if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke();
      if (dots && lw > 2) for (j = 0; j <= KMAX; j++) { ctx.beginPath(); ctx.arc(X(j), Y(Math.max(-1.5, Math.min(1.5, est[j][i]))), 2.6, 0, 6.2832); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    for (var i = 0; i < M.n; i++) if (i !== fonte && i !== hover) curva(i, col.soft, 1.1, 0.5);
    if (hover >= 0 && hover !== fonte) curva(hover, col.carac, 2.6, 1);
    curva(fonte, col.choque, 3, 1);
    ctx.strokeStyle = col.ink; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2;
    var xs = X(k); ctx.beginPath(); ctx.moveTo(xs, t); ctx.lineTo(xs, t + h); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  function niceStep(x) { var m = Math.pow(10, Math.floor(Math.log10(x))), f = x / m; return Math.max(1, (f < 1.5 ? 1 : f < 3.5 ? 2.5 : f < 7.5 ? 5 : 10) * m); }

  function draw() {
    var col = colors(), u = est[k], mx = -Infinity, mn = Infinity, soma = 0;
    u.forEach(function (x) { mx = Math.max(mx, x); mn = Math.min(mn, x); soma += x; });
    var limpa = function (x) { return Math.abs(x) < 5e-7 ? 0 : x; };
    oK.textContent = String(k);
    oC.textContent = fmt(c, 3) + " (= " + fmt(parseFloat(rC.value), 2) + "/d_max)";
    drawRede(u, col); drawCurvas(col);
    var aviso = instavel()
      ? '<span class="alerta">c·λ_max = ' + fmt(c * M.lambdaMax, 2) + ' > 2: o passo é grande demais e as diferenças crescem a cada passo</span>'
      : c * M.dmax > 1 + 1e-12 ? '<span class="alerta">c > 1/d_max: podem aparecer valores negativos</span>' : "";
    read.innerHTML = "<span>passo k = <b>" + k + "</b></span>" +
      "<span>soma de u: <b>" + fmt(limpa(soma), 3) + "</b></span>" +
      "<span>maior valor: <b>" + fmt(limpa(mx), 3) + "</b> · menor: <b" + (mn < -1e-9 ? ' class="alerta"' : "") + ">" + fmt(limpa(mn), 3) + "</b> · média 1/n = <b>" + fmt(1 / M.n, 3) + "</b></span>" +
      "<span>d_max = <b>" + M.dmax + "</b> · λ₂ = <b>" + fmt(M.lambda2, 3) + "</b>" + (instavel() ? " · sem equilíbrio" : " · passos até o equilíbrio ≈ 1/(cλ₂) = <b>" + fmt(1 / (c * M.lambda2), 1) + "</b>") + "</span>" + aviso;
    hov.textContent = hover >= 0
      ? "vértice " + hover + " (grau " + M.graus[hover] + "): u = " + fmt(limpa(u[hover]), 3) + (hover === fonte ? " — é o vértice inicial" : "")
      : "Clique em um vértice para pôr nele toda a quantidade.";
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  /* ---------- interação ---------- */
  function setK(v) { k = Math.min(KMAX, Math.max(0, v)); rK.value = k; }
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
  sFonte.addEventListener("change", function () { escolheFonte(parseInt(sFonte.value, 10)); });
  rC.addEventListener("input", function () { recalcula(KMAX ? k / KMAX : 0); });
  rK.addEventListener("input", function () { k = parseInt(rK.value, 10); schedule(); });
  cLin.addEventListener("change", schedule);
  btn.addEventListener("click", function () {
    playing = !playing; btn.textContent = playing ? "⏸ Pausar" : "▶ Animar";
    if (playing) { if (k >= KMAX) setK(0); lastTs = 0; acc = xFrac(k); requestAnimationFrame(tick); }
  });
  function tick(ts) {
    if (!playing) return;
    // anda a uma velocidade constante no eixo do gráfico (~7 s no total): na escala log, devagar no começo
    if (lastTs) {
      acc = Math.min(1, acc + (ts - lastTs) / 7000);
      var nk = k; while (nk < KMAX && xFrac(nk + 1) <= acc + 1e-9) nk++;
      if (nk !== k) { setK(nk); draw(); }
    }
    lastTs = ts;
    if (k >= KMAX) { playing = false; btn.textContent = "▶ Animar"; return; }
    requestAnimationFrame(tick);
  }
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);

  Object.keys(K.REDES).forEach(function (id) { var o = document.createElement("option"); o.value = id; o.textContent = K.REDES[id].label; sRede.appendChild(o); });
  sRede.value = "carate";
  carregaRede();
})();
