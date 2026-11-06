/* Demo da página "Comunidades pelo vetor de Fiedler".
 * Esquerda: a rede. Forma do vértice = grupo verdadeiro (círculo ou quadrado); cor = lado escolhido pela divisão.
 * Direita: os valores de q₂, em ordem crescente, com a linha que separa os dois lados.  Depende de redes-core.js. */
(function () {
  "use strict";
  var K = window.RedesCore, root = document.getElementById("demo-fiedler");
  if (!K || !root) return;

  var $ = function (id) { return document.getElementById(id); };
  var sRede = $("f-rede"), sRegra = $("f-regra"), boxB = $("f-blocos"), rIn = $("f-pin"), oIn = $("f-pinv"), rOut = $("f-pout"), oOut = $("f-poutv"),
      bSort = $("f-sorteia"), read = $("f-readout"), hov = $("f-hover"), cG = $("f-rede-canvas"), cQ = $("f-q-canvas");
  var KB = 16, seed = 7, R = null, hover = -1, raf = 0;

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
    return { X: function (p) { return ox + p[0] * side; }, Y: function (p) { return oy + p[1] * side; }, r: Math.max(7, Math.min(11, side / 34)) };
  }
  function forma(ctx, x, y, r, quadrado) {
    ctx.beginPath();
    if (quadrado) ctx.rect(x - r * 0.88, y - r * 0.88, r * 1.76, r * 1.76); else ctx.arc(x, y, r, 0, 6.2832);
  }

  /* ---------- modelo ---------- */
  function monta() {
    var blocos = sRede.value === "blocos", g;
    boxB.hidden = !blocos;
    if (blocos) {
      // sorteia até sair uma rede conexa (com p_in muito pequeno pode não sair: aí a leitura avisa)
      for (var t = 0; t < 30; t++) {
        g = K.blocos(KB, parseFloat(rIn.value), parseFloat(rOut.value), seed + 1000 * t);
        if (Math.max.apply(null, K.componentes(g.n, g.edges)) === 0) break;
      }
    }
    else { var c = K.carate(); g = { n: c.n, edges: c.edges, pos: c.pos, grupo: K.faccoes() }; }
    var L = K.laplacian(g.n, g.edges), eig = K.eigSym(L), comp = K.componentes(g.n, g.edges), q = eig.vectors[1].slice(), s = 0;
    q.forEach(function (x, i) { s += x * (g.grupo[i] ? 1 : -1); }); if (s < 0) q = q.map(function (x) { return -x; });   // orienta q₂ como os grupos
    R = { g: g, eig: eig, q: q, conexa: Math.max.apply(null, comp) === 0, qmax: Math.max.apply(null, q.map(Math.abs)) || 1 };
    divide();
  }
  function divide() {
    var g = R.g;
    R.lado = K.divide(R.q, g.edges, sRegra.value);
    R.ordem = R.q.map(function (_, i) { return i; }).sort(function (a, b) { return R.q[a] - R.q[b]; });
    R.nS = R.lado.filter(Boolean).length;
    schedule();
  }

  /* ---------- desenho ---------- */
  function drawRede(col) {
    var P = setup(cG), ctx = P.ctx, G = geom(P), g = R.g;
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1.2;
    g.edges.forEach(function (e) {
      var a = g.pos[e[0]], b = g.pos[e[1]], cortado = R.lado[e[0]] !== R.lado[e[1]];
      ctx.strokeStyle = cortado ? col.ink : col.rule; ctx.globalAlpha = cortado ? 0.7 : 1; ctx.setLineDash(cortado ? [4, 3] : []);
      ctx.beginPath(); ctx.moveTo(G.X(a), G.Y(a)); ctx.lineTo(G.X(b), G.Y(b)); ctx.stroke();
    });
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.font = "9px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    g.pos.forEach(function (p, i) {
      var x = G.X(p), y = G.Y(p), f = 0.3 + 0.6 * Math.abs(R.q[i]) / R.qmax, errado = R.lado[i] !== g.grupo[i];
      ctx.fillStyle = mix(col.paper, R.lado[i] ? col.carac : col.choque, f); forma(ctx, x, y, G.r, g.grupo[i]); ctx.fill();
      ctx.lineWidth = i === hover ? 3 : errado ? 2.6 : 1.3; ctx.strokeStyle = i === hover ? col.carac : errado ? col.ink : col.soft;
      forma(ctx, x, y, G.r, g.grupo[i]); ctx.stroke();
      ctx.fillStyle = col.ink; ctx.fillText(String(i), x, y + 0.5);
    });
  }
  function drawQ(col) {
    var P = setup(cQ), ctx = P.ctx, l = 46, r = 12, t = 18, b = 30, w = P.w - l - r, h = P.h - t - b, n = R.g.n;
    var ymax = R.qmax * 1.1, Y = function (v) { return t + (1 - (v + ymax) / (2 * ymax)) * h; }, X = function (j) { return l + (j + 0.5) / n * w; };
    ctx.font = "12px sans-serif"; ctx.lineWidth = 1; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    [-ymax / 1.1, 0, ymax / 1.1].forEach(function (v) { var py = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(fmt(v, 2), l - 6, py); });
    ctx.fillStyle = col.ink; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("valores de q₂, do menor para o maior", l + 6, 0);
    ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("vértices em ordem de q₂", P.w - r, P.h - 2);
    // a separação: entre o último do lado "falso" e o primeiro do lado "verdadeiro" na ordem
    var corteJ = -1;
    for (var j = 0; j < n - 1; j++) if (R.lado[R.ordem[j]] !== R.lado[R.ordem[j + 1]]) { corteJ = j; break; }
    if (corteJ >= 0) { ctx.strokeStyle = col.ink; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4; var xs = (X(corteJ) + X(corteJ + 1)) / 2; ctx.beginPath(); ctx.moveTo(xs, t); ctx.lineTo(xs, t + h); ctx.stroke(); ctx.setLineDash([]); }
    var rr = Math.max(3, Math.min(6, w / n / 2.6));
    R.ordem.forEach(function (i, j) {
      var x = X(j), y = Y(R.q[i]), errado = R.lado[i] !== R.g.grupo[i];
      ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, Y(0)); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = R.lado[i] ? col.carac : col.choque; forma(ctx, x, y, rr, R.g.grupo[i]); ctx.fill();
      if (errado || i === hover) { ctx.lineWidth = i === hover ? 2.6 : 1.8; ctx.strokeStyle = i === hover ? col.carac : col.ink; forma(ctx, x, y, rr + 1.5, R.g.grupo[i]); ctx.stroke(); }
    });
  }

  function draw() {
    var col = colors(), g = R.g, n = g.n, ac = K.acertos(R.lado, g.grupo), c = K.corte(g.edges, R.lado), cv = K.corte(g.edges, g.grupo), nS = R.nS;
    drawRede(col); drawQ(col);
    oIn.textContent = fmt(parseFloat(rIn.value), 2); oOut.textContent = fmt(parseFloat(rOut.value), 2);
    read.innerHTML = (R.conexa ? "" : '<span style="color:var(--choque);font-weight:600">rede partida: λ₂ = 0 e q₂ só separa componentes; sorteie de novo</span>') +
      "<span>lados: <b>" + nS + "</b> e <b>" + (n - nS) + "</b> vértices</span>" +
      "<span>links cortados: <b>" + c + "</b> (entre os grupos verdadeiros: " + cv + ")</span>" +
      "<span>acertos: <b>" + ac + "</b> de " + n + "</span>" +
      "<span>λ₂ = <b>" + fmt(R.eig.values[1]) + "</b> · toda bisseção corta ≥ nλ₂/4 = <b>" + fmt(n * R.eig.values[1] / 4, 2) + "</b></span>";
    hov.textContent = hover >= 0
      ? "vértice " + hover + ": q₂ = " + fmt(R.q[hover]) + ", grupo verdadeiro " + (g.grupo[hover] ? "■" : "●") + (R.lado[hover] !== g.grupo[hover] ? " — caiu do lado errado" : "")
      : "Passe o mouse sobre um vértice, na rede ou no gráfico.";
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  /* ---------- interação ---------- */
  function nodeAt(ev) {
    var rect = cG.getBoundingClientRect(), x = ev.clientX - rect.left, y = ev.clientY - rect.top, G = geom({ w: cG.clientWidth, h: cG.clientHeight }), best = -1, bd = Infinity;
    R.g.pos.forEach(function (p, i) { var d = Math.hypot(G.X(p) - x, G.Y(p) - y); if (d < bd) { bd = d; best = i; } });
    return bd <= G.r + 4 ? best : -1;
  }
  function qAt(ev) {
    var rect = cQ.getBoundingClientRect(), x = ev.clientX - rect.left, w = cQ.clientWidth - 58, n = R.g.n, j = Math.floor((x - 46) / w * n);
    return j >= 0 && j < n ? R.ordem[j] : -1;
  }
  cG.addEventListener("mousemove", function (ev) { var i = nodeAt(ev); if (i !== hover) { hover = i; schedule(); } });
  cQ.addEventListener("mousemove", function (ev) { var i = qAt(ev); if (i !== hover) { hover = i; schedule(); } });
  [cG, cQ].forEach(function (c) { c.addEventListener("mouseleave", function () { hover = -1; schedule(); }); });
  sRede.addEventListener("change", monta);
  sRegra.addEventListener("change", divide);
  rIn.addEventListener("input", monta); rOut.addEventListener("input", monta);
  bSort.addEventListener("click", function () { seed = (seed * 7919 + 13) % 100003; monta(); });
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);
  monta();
})();
