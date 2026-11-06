/* Demo da página "Redes com sinais e equilíbrio".
 * Links positivos: linha cheia azul; negativos: tracejado vermelho. Clique num link para trocar o sinal.
 * Os vértices são pintados como na prova do teorema: a raiz recebe uma cor e, descendo pela árvore de busca,
 * cada link positivo mantém a cor e cada negativo troca. Links que contrariam essa pintura ficam destacados.
 * Depende de redes-core.js. */
(function () {
  "use strict";
  var K = window.RedesCore, root = document.getElementById("demo-sinais");
  if (!K || !root) return;

  var $ = function (id) { return document.getElementById(id); };
  var sRede = $("s-rede"), cArv = $("s-arvore"), bRest = $("s-restaura"), read = $("s-readout"), hov = $("s-hover"), cv = $("s-rede-canvas");
  var R = null, orig = null, raiz = 0, hoverE = -1, hoverV = -1, raf = 0;
  var COR = ["#2a9d8f", "#c9a227"];   // as duas cores da pintura (distintas das cores dos sinais)

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
    var pad = 22, sx = P.w - 2 * pad, sy = P.h - 2 * pad, side = Math.min(sx, sy * 1.25), ox = (P.w - side) / 2, oy = pad + (sy - Math.min(sy, side)) / 2, hy = Math.min(sy, side);
    return { X: function (p) { return ox + p[0] * side; }, Y: function (p) { return oy + p[1] * hy; }, r: R.nomes ? 8 : 14 };
  }
  function nome(i) { return R.nomes ? R.nomes[i] : String(i); }

  /* ---------- modelo ---------- */
  function carrega() {
    var g = K.SINAIS[sRede.value].make();
    orig = g.edges.map(function (e) { return e.slice(); });
    R = { n: g.n, edges: g.edges, pos: g.pos, nomes: g.nomes || null };
    raiz = 0; hoverE = hoverV = -1; recalcula();
  }
  function recalcula() {
    R.T = K.pinturaArvore(R.n, R.edges, raiz);
    R.ciclo = K.cicloImpar(R.n, R.edges);
    R.frus = R.n <= 20 ? K.frustracao(R.n, R.edges) : null;
    schedule();
  }

  /* ---------- desenho ---------- */
  function draw() {
    var col = colors(), P = setup(cv), ctx = P.ctx, G = geom(P), T = R.T, conf = {}, ciclo = {};
    T.conflitos.forEach(function (k) { conf[k] = true; });
    if (R.ciclo) R.ciclo.forEach(function (v, i) { var w = R.ciclo[(i + 1) % R.ciclo.length]; ciclo[Math.min(v, w) + "-" + Math.max(v, w)] = true; });
    ctx.lineCap = "round";
    // destaque do ciclo ímpar, por baixo de tudo
    R.edges.forEach(function (e) {
      if (!ciclo[Math.min(e[0], e[1]) + "-" + Math.max(e[0], e[1])]) return;
      ctx.strokeStyle = mix(col.paper, "#c9a227", 0.55); ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(G.X(R.pos[e[0]]), G.Y(R.pos[e[0]])); ctx.lineTo(G.X(R.pos[e[1]]), G.Y(R.pos[e[1]])); ctx.stroke();
    });
    R.edges.forEach(function (e, k) {
      var a = R.pos[e[0]], b = R.pos[e[1]], arv = cArv.checked && T.naArvore[k];
      if (conf[k]) { ctx.strokeStyle = col.ink; ctx.globalAlpha = 0.25; ctx.lineWidth = 7; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(G.X(a), G.Y(a)); ctx.lineTo(G.X(b), G.Y(b)); ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.strokeStyle = e[2] > 0 ? col.carac : col.choque; ctx.setLineDash(e[2] > 0 ? [] : [6, 4]);
      ctx.lineWidth = k === hoverE ? 4 : arv ? 3 : 1.6; ctx.globalAlpha = cArv.checked && !arv && !conf[k] ? 0.45 : 1;
      ctx.beginPath(); ctx.moveTo(G.X(a), G.Y(a)); ctx.lineTo(G.X(b), G.Y(b)); ctx.stroke();
    });
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.textBaseline = "middle";
    R.pos.forEach(function (p, i) {
      var x = G.X(p), y = G.Y(p);
      ctx.fillStyle = mix(col.paper, COR[T.cor[i] > 0 ? 0 : 1], 0.8); ctx.beginPath(); ctx.arc(x, y, G.r, 0, 6.2832); ctx.fill();
      ctx.lineWidth = i === raiz ? 3.2 : i === hoverV ? 2.6 : 1.4; ctx.strokeStyle = i === raiz || i === hoverV ? col.ink : col.soft;
      ctx.beginPath(); ctx.arc(x, y, G.r, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = col.ink;
      if (R.nomes) { ctx.font = "11px sans-serif"; ctx.textAlign = p[0] > 0.6 ? "left" : "right"; ctx.fillText(nome(i), x + (p[0] > 0.6 ? 1 : -1) * (G.r + 4), y); }
      else { ctx.font = "12px sans-serif"; ctx.textAlign = "center"; ctx.fillText(nome(i), x, y + 0.5); }
    });

    var npos = R.edges.filter(function (e) { return e[2] > 0; }).length, nneg = R.edges.length - npos, eq = !R.ciclo, txt;
    var grupo = function (c) { return R.pos.map(function (_, i) { return i; }).filter(function (i) { return T.cor[i] === c; }).map(nome).join(", "); };
    txt = "<span>links: <b>" + npos + "</b> positivos, <b>" + nneg + "</b> negativos</span>" +
      "<span>equilibrada? <b>" + (eq ? "sim" : "não") + "</b></span>";
    if (eq) txt += "<span>grupos: {" + grupo(1) + "} e {" + (grupo(-1) || "vazio") + "}</span>";
    else {
      var neg = 0; R.ciclo.forEach(function (v, i) { if (K.sinalEntre(R.edges, v, R.ciclo[(i + 1) % R.ciclo.length]) < 0) neg++; });
      txt += "<span>links em conflito com a pintura da árvore: <b>" + T.conflitos.length + "</b></span>" +
        "<span>um ciclo com número ímpar de negativos: <b>" + R.ciclo.map(nome).join(" – ") + " – " + nome(R.ciclo[0]) + "</b> (" + R.ciclo.length + " links, " + neg + (neg === 1 ? " negativo" : " negativos") + ")</span>";
    }
    if (R.frus) txt += "<span>índice de frustração (menos links contrariados possível com duas cores): <b>" + R.frus.indice + "</b></span>";
    read.innerHTML = txt;
    if (hoverE >= 0) { var e = R.edges[hoverE]; hov.textContent = "link " + nome(e[0]) + " – " + nome(e[1]) + " (" + (e[2] > 0 ? "+" : "−") + "): clique para trocar o sinal" + (conf[hoverE] ? "; está em conflito com a pintura" : "") + "."; }
    else if (hoverV >= 0) hov.textContent = nome(hoverV) + (hoverV === raiz ? " é a raiz da árvore" : ": clique para usar como raiz da árvore");
    else hov.textContent = "Clique num link para trocar o sinal; clique num vértice para escolher a raiz.";
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  /* ---------- interação ---------- */
  function alvo(ev) {
    var rect = cv.getBoundingClientRect(), x = ev.clientX - rect.left, y = ev.clientY - rect.top,
        G = geom({ w: cv.clientWidth, h: cv.clientHeight }), vi = -1, vd = Infinity, ei = -1, ed = Infinity;
    R.pos.forEach(function (p, i) { var d = Math.hypot(G.X(p) - x, G.Y(p) - y); if (d < vd) { vd = d; vi = i; } });
    if (vd <= G.r + 3) return { v: vi, e: -1 };
    R.edges.forEach(function (e, i) {
      var ax = G.X(R.pos[e[0]]), ay = G.Y(R.pos[e[0]]), bx = G.X(R.pos[e[1]]), by = G.Y(R.pos[e[1]]);
      var dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, s = L2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)) : 0;
      var d = Math.hypot(ax + s * dx - x, ay + s * dy - y); if (d < ed) { ed = d; ei = i; }
    });
    return { v: -1, e: ed <= 6 ? ei : -1 };
  }
  cv.addEventListener("mousemove", function (ev) { var a = alvo(ev); cv.style.cursor = a.e >= 0 || a.v >= 0 ? "pointer" : "default"; if (a.e !== hoverE || a.v !== hoverV) { hoverE = a.e; hoverV = a.v; schedule(); } });
  cv.addEventListener("mouseleave", function () { hoverE = hoverV = -1; schedule(); });
  cv.addEventListener("click", function (ev) {
    var a = alvo(ev);
    if (a.e >= 0) { R.edges[a.e][2] *= -1; recalcula(); }
    else if (a.v >= 0) { raiz = a.v; recalcula(); }
  });
  sRede.addEventListener("change", carrega);
  cArv.addEventListener("change", schedule);
  bRest.addEventListener("click", function () { R.edges = orig.map(function (e) { return e.slice(); }); recalcula(); });
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);

  Object.keys(K.SINAIS).forEach(function (id) { var o = document.createElement("option"); o.value = id; o.textContent = K.SINAIS[id].label; sRede.appendChild(o); });
  sRede.value = "gama";
  carrega();
  window.DemoSinais = { troca: function (k) { R.edges[k][2] *= -1; recalcula(); }, estado: function () { return R; } };
})();
