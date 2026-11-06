/* Demo da página "Laplaciano com sinais": opiniões com antagonismo, u ← u − c L u, com L o laplaciano com sinais.
 * Esquerda: a rede (laços + azuis, − vermelhos tracejados; clique para trocar o sinal); vértices coloridos pela opinião
 * no passo k (verde-azulado > 0, dourado < 0, intensidade |u|). Direita: as opiniões u_i ao longo dos passos.
 * Depende de redes-core.js. */
(function () {
  "use strict";
  var K = window.RedesCore, root = document.getElementById("demo-lsin");
  if (!K || !root) return;

  var $ = function (id) { return document.getElementById(id); };
  var sRede = $("l-rede"), bRest = $("l-restaura"), bNov = $("l-novas"), rK = $("l-k"), oK = $("l-kv"), btn = $("l-play"),
      read = $("l-readout"), hov = $("l-hover"), cG = $("l-rede-canvas"), cO = $("l-op-canvas");
  var R = null, orig = null, semente = 3, k = 0, KMAX = 50, hoverE = -1, hoverV = -1, playing = false, lastTs = 0, acc = 0, raf = 0;
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
    return { X: function (p) { return ox + p[0] * side; }, Y: function (p) { return oy + p[1] * side; }, r: R.nomes ? 8 : 13 };
  }
  function nome(i) { return R.nomes ? R.nomes[i] : String(i); }

  /* ---------- modelo ---------- */
  function carrega() {
    var g = K.SINAIS[sRede.value].make();
    orig = g.edges.map(function (e) { return e.slice(); });
    R = { n: g.n, edges: g.edges, pos: g.pos, nomes: g.nomes || null };
    hoverE = hoverV = -1; recalcula(0);
  }
  function opinioes() { var r = K.rng(semente), u = []; for (var i = 0; i < R.n; i++) u.push(2 * r() - 1); return u; }
  function recalcula(frac) {
    var L = K.laplacianoSinais(R.n, R.edges), eig = K.eigSym(L), dmax = Math.max.apply(null, L.map(function (r, i) { return r[i]; }));
    var l1 = eig.values[0], q = eig.vectors[0], s = q.map(function (x) { return x >= 0 ? 1 : -1; });
    var c = 0.9 / dmax, lam = l1 > 1e-9 ? l1 : eig.values[1];
    KMAX = Math.max(20, Math.min(400, Math.ceil(5 / (c * lam))));
    R.L = L; R.eig = eig; R.l1 = l1; R.c = c; R.s = s; R.eq = K.cicloImpar(R.n, R.edges) === null;
    R.contrariaQ = R.edges.filter(function (e) { return s[e[0]] * s[e[1]] !== e[2]; }).length;
    R.frus = R.n <= 20 ? K.frustracao(R.n, R.edges).indice : null;
    R.u0 = opinioes(); R.est = K.itera(L, R.u0, c, KMAX);
    // no caso equilibrado, a pintura s (de q₁) é a mesma da prova, e sᵀu se conserva
    R.cons = R.s.reduce(function (a, x, i) { return a + x * R.u0[i]; }, 0);
    // o sinal de q₁ é arbitrário: escolhe o que faz sᵀu₀ ≥ 0, para a cor de cada lado bater com o sinal da opinião final
    if (R.cons < 0) { R.s = R.s.map(function (x) { return -x; }); R.cons = -R.cons; }
    rK.max = KMAX; setK(Math.round(frac * KMAX)); schedule();
  }

  /* ---------- desenho ---------- */
  function drawRede(u, col) {
    var P = setup(cG), ctx = P.ctx, G = geom(P);
    ctx.lineCap = "round";
    R.edges.forEach(function (e, k2) {
      var a = R.pos[e[0]], b = R.pos[e[1]], contra = R.s[e[0]] * R.s[e[1]] !== e[2];
      if (contra) { ctx.strokeStyle = col.ink; ctx.globalAlpha = 0.22; ctx.lineWidth = 7; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(G.X(a), G.Y(a)); ctx.lineTo(G.X(b), G.Y(b)); ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.strokeStyle = e[2] > 0 ? col.carac : col.choque; ctx.setLineDash(e[2] > 0 ? [] : [6, 4]); ctx.lineWidth = k2 === hoverE ? 4 : 1.7;
      ctx.beginPath(); ctx.moveTo(G.X(a), G.Y(a)); ctx.lineTo(G.X(b), G.Y(b)); ctx.stroke();
    });
    ctx.setLineDash([]); ctx.textBaseline = "middle";
    var um = Math.max.apply(null, u.map(Math.abs)) || 1;
    R.pos.forEach(function (p, i) {
      var x = G.X(p), y = G.Y(p), f = Math.min(1, Math.abs(u[i]) / Math.max(um, 1e-12));
      ctx.fillStyle = mix(col.paper, COR[u[i] >= 0 ? 0 : 1], 0.15 + 0.8 * f); ctx.beginPath(); ctx.arc(x, y, G.r, 0, 6.2832); ctx.fill();
      ctx.lineWidth = i === hoverV ? 2.6 : 1.3; ctx.strokeStyle = i === hoverV ? col.ink : col.soft; ctx.beginPath(); ctx.arc(x, y, G.r, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = col.ink;
      if (R.nomes) { ctx.font = "11px sans-serif"; ctx.textAlign = p[0] > 0.6 ? "left" : "right"; ctx.fillText(nome(i), x + (p[0] > 0.6 ? 1 : -1) * (G.r + 4), y); }
      else { ctx.font = "12px sans-serif"; ctx.textAlign = "center"; ctx.fillText(nome(i), x, y + 0.5); }
    });
  }
  function drawOp(col) {
    var P = setup(cO), ctx = P.ctx, l = 40, r = 12, t = 14, b = 30, w = P.w - l - r, h = P.h - t - b;
    var X = function (kv) { return l + kv / KMAX * w; }, Y = function (v) { return t + (1 - (v + 1) / 2) * h; };
    ctx.font = "12px sans-serif"; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.lineWidth = 1; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    [-1, -0.5, 0, 0.5, 1].forEach(function (v) { var py = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(fmt(v, 1), l - 6, py); });
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    var st = Math.max(1, Math.round(KMAX / 4 / 5) * 5) || 1;
    for (var kv = 0; kv <= KMAX; kv += st) { var px = Math.round(X(kv)) + 0.5; ctx.beginPath(); ctx.moveTo(px, t); ctx.lineTo(px, t + h); ctx.stroke(); ctx.fillText(String(kv), px, t + h + 6); }
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("passo k", P.w - r, P.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("opiniões uᵢ", l + 6, 0);
    ctx.save(); ctx.beginPath(); ctx.rect(l, t - 2, w, h + 4); ctx.clip(); ctx.lineJoin = "round";
    if (R.eq) {   // a polarização prevista: ± (sᵀu₀)/n
      var a = R.cons / R.n; ctx.strokeStyle = col.ink; ctx.setLineDash([2, 4]); ctx.lineWidth = 1.3;
      [a, -a].forEach(function (v) { ctx.beginPath(); ctx.moveTo(l, Y(v)); ctx.lineTo(l + w, Y(v)); ctx.stroke(); }); ctx.setLineDash([]);
    }
    for (var i = 0; i < R.n; i++) {
      ctx.strokeStyle = COR[R.s[i] > 0 ? 0 : 1]; ctx.lineWidth = i === hoverV ? 3 : 1.5; ctx.globalAlpha = hoverV < 0 || i === hoverV ? 0.9 : 0.35;
      ctx.beginPath(); for (var j = 0; j <= KMAX; j++) { var x = X(j), y = Y(Math.max(-1.2, Math.min(1.2, R.est[j][i]))); if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.strokeStyle = col.ink; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2; var xs = X(k);
    ctx.beginPath(); ctx.moveTo(xs, t); ctx.lineTo(xs, t + h); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }

  function draw() {
    var col = colors(), u = R.est[k], mu = Math.max.apply(null, u.map(Math.abs));
    oK.textContent = String(k);
    drawRede(u, col); drawOp(col);
    var txt = "<span>λ₁ = <b>" + fmt(R.l1) + "</b> · equilibrada? <b>" + (R.eq ? "sim" : "não") + "</b></span>";
    if (R.frus != null) txt += "<span>índice de frustração: <b>" + R.frus + "</b> · cota nλ₁/4 = <b>" + fmt(R.n * R.l1 / 4, 2) + "</b> · a divisão pelo sinal de q₁ contraria <b>" + R.contrariaQ + "</b>" + (R.contrariaQ === 1 ? " laço" : " laços") + "</span>";
    txt += "<span>passo k = <b>" + k + "</b> · maior |uᵢ| = <b>" + fmt(mu) + "</b>" +
      (R.eq ? " · sᵀu = <b>" + fmt(R.s.reduce(function (a, x, i) { return a + x * u[i]; }, 0)) + "</b> (conservado)" : " · cai como (1 − cλ₁)ᵏ = " + fmt(Math.pow(1 - R.c * R.l1, k)) ) + "</span>";
    read.innerHTML = txt;
    if (hoverE >= 0) { var e = R.edges[hoverE]; hov.textContent = "laço " + nome(e[0]) + " – " + nome(e[1]) + " (" + (e[2] > 0 ? "+" : "−") + "): clique para trocar o sinal."; }
    else if (hoverV >= 0) hov.textContent = nome(hoverV) + ": opinião " + fmt(u[hoverV]) + "; q₁ põe no lado " + (R.s[hoverV] > 0 ? "verde-azulado" : "dourado") + ".";
    else hov.textContent = "Clique num laço para trocar o sinal. Passe o mouse num vértice para ver a opinião.";
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  /* ---------- interação ---------- */
  function setK(v) { k = Math.min(KMAX, Math.max(0, v)); rK.value = k; }
  function alvo(ev) {
    var rect = cG.getBoundingClientRect(), x = ev.clientX - rect.left, y = ev.clientY - rect.top,
        G = geom({ w: cG.clientWidth, h: cG.clientHeight }), vi = -1, vd = Infinity, ei = -1, ed = Infinity;
    R.pos.forEach(function (p, i) { var d = Math.hypot(G.X(p) - x, G.Y(p) - y); if (d < vd) { vd = d; vi = i; } });
    if (vd <= G.r + 3) return { v: vi, e: -1 };
    R.edges.forEach(function (e, i) {
      var ax = G.X(R.pos[e[0]]), ay = G.Y(R.pos[e[0]]), bx = G.X(R.pos[e[1]]), by = G.Y(R.pos[e[1]]);
      var dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, s = L2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)) : 0;
      var d = Math.hypot(ax + s * dx - x, ay + s * dy - y); if (d < ed) { ed = d; ei = i; }
    });
    return { v: -1, e: ed <= 6 ? ei : -1 };
  }
  cG.addEventListener("mousemove", function (ev) { var a = alvo(ev); cG.style.cursor = a.e >= 0 ? "pointer" : "default"; if (a.e !== hoverE || a.v !== hoverV) { hoverE = a.e; hoverV = a.v; schedule(); } });
  cG.addEventListener("mouseleave", function () { hoverE = hoverV = -1; schedule(); });
  cG.addEventListener("click", function (ev) { var a = alvo(ev); if (a.e >= 0) { R.edges[a.e][2] *= -1; recalcula(k / KMAX); } });
  sRede.addEventListener("change", carrega);
  bRest.addEventListener("click", function () { R.edges = orig.map(function (e) { return e.slice(); }); recalcula(k / KMAX); });
  bNov.addEventListener("click", function () { semente = (semente * 7919 + 17) % 100003; recalcula(0); });
  rK.addEventListener("input", function () { k = parseInt(rK.value, 10); schedule(); });
  btn.addEventListener("click", function () {
    playing = !playing; btn.textContent = playing ? "⏸ Pausar" : "▶ Animar";
    if (playing) { if (k >= KMAX) setK(0); lastTs = 0; acc = k / KMAX; requestAnimationFrame(tick); }
  });
  function tick(ts) {
    if (!playing) return;
    if (lastTs) { acc = Math.min(1, acc + (ts - lastTs) / 6000); var nk = Math.floor(acc * KMAX); if (nk !== k) { setK(nk); draw(); } }
    lastTs = ts;
    if (k >= KMAX) { playing = false; btn.textContent = "▶ Animar"; return; }
    requestAnimationFrame(tick);
  }
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);

  Object.keys(K.SINAIS).forEach(function (id) { var o = document.createElement("option"); o.value = id; o.textContent = K.SINAIS[id].label; sRede.appendChild(o); });
  sRede.value = "faccoes";
  carrega();
  window.DemoLapSinal = { troca: function (i) { R.edges[i][2] *= -1; recalcula(k / KMAX); }, estado: function () { return R; } };
})();
