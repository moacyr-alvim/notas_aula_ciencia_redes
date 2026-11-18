/* Demo da página "O limiar e o maior autovalor de A".
 * Sorteia uma rede do modelo de configuração com graus em lei de potência e calcula
 *   esquerda: o autovetor do maior autovalor de A, componente v_i contra o grau k_i;
 *   direita: a fração infectada no equilíbrio do SIS vértice a vértice, contra β/μ,
 *            com o limiar 1/λ_max e o do campo médio por classes de grau, ⟨k⟩/⟨k²⟩.
 * Depende de epi-core.js. */
(function () {
  "use strict";
  var E = window.EpiCore, root = document.getElementById("demo-av");
  if (!E || !root) return;

  var $ = function (id) { return document.getElementById(id); };
  var rG = $("a-gama"), oG = $("a-gamav"), sN = $("a-n"), bNova = $("a-nova"), read = $("a-readout"), cV = $("a-vet-canvas"), cP = $("a-prev-canvas");
  var MU = 0.2, PONTOS = 22, PASSOS = 400, KMIN = 3;
  var semente = 1, rede = null, curva = [], curvaHMF = [], tarefa = 0, raf = 0, timer = 0;

  function fmt(x, d) { return x.toFixed(d == null ? 2 : d).replace(".", ",").replace("-", "−"); }
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function colors() { return { ink: css("--ink"), soft: css("--ink-soft"), rule: css("--rule"), carac: css("--carac"), choque: css("--choque") }; }
  function setup(canvas) {
    var dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    var ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }
  function log10(x) { return Math.log(x) / Math.LN10; }

  function sorteia() {
    var g = parseFloat(rG.value), n = parseInt(sN.value, 10), kmax = Math.round(KMIN * Math.pow(n, 1 / (g - 1)));
    var G = E.configuracao(n, E.leiPotencia(g, KMIN, kmax), E.rng(semente * 7919 + n)), L = E.listas(n, G.arestas);
    var av = E.autovalorMax(L, 600), k = L.graus, m1 = 0, m2 = 0, km = 0, ipr = 0, i;
    for (i = 0; i < n; i++) { m1 += k[i]; m2 += k[i] * k[i]; if (k[i] > km) km = k[i]; ipr += Math.pow(av.v[i], 4); }
    m1 /= n; m2 /= n;
    var pk = new Array(km + 1).fill(0); for (i = 0; i < n; i++) pk[k[i]] += 1 / n;   /* a distribuição de graus da rede sorteada */
    rede = { n: n, L: L, lam: av.lambda, v: av.v, m1: m1, kap: m2 / m1, km: km, efetivos: 1 / ipr, pk: pk };
    var a = Math.min(1 / rede.lam, 1 / rede.kap), b = Math.max(1 / rede.lam, 1 / rede.kap);
    rede.xmin = a / 3; rede.xmax = Math.min(1, b * 4);
    curva = []; curvaHMF = [];
    var minha = ++tarefa, j = 0;
    (function proximo() {
      if (minha !== tarefa || j >= PONTOS) return;
      var x = Math.exp(Math.log(rede.xmin) + (Math.log(rede.xmax) - Math.log(rede.xmin)) * j / (PONTOS - 1)), beta = x * MU;
      var p = E.sisVertices(L, beta, MU, new Float64Array(n).fill(0.5), PASSOS), s = 0;
      for (i = 0; i < n; i++) s += p[i];
      var ser = E.serieSISgrau(pk, 0.5, beta, MU, PASSOS);
      curva.push([x, s / n]); curvaHMF.push([x, E.media(pk, ser[PASSOS])]);
      j++; schedule(); setTimeout(proximo, 0);
    })();
    schedule();
  }

  function drawVet(col) {
    var P = setup(cV), ctx = P.ctx, l = 48, r = 12, t = 18, b = 30, w = P.w - l - r, h = P.h - t - b, n = rede.n, k = rede.L.graus, v = rede.v;
    var vmax = 0, i; for (i = 0; i < n; i++) vmax = Math.max(vmax, v[i]);
    var ya = Math.floor(log10(vmax)) - 3, yb = Math.ceil(log10(vmax)), xa = log10(2), xb = log10(Math.max(rede.km * 1.3, 20));
    var X = function (q) { return l + (log10(q) - xa) / (xb - xa) * w; }, Y = function (q) { return t + (1 - (log10(Math.max(q, Math.pow(10, ya))) - ya) / (yb - ya)) * h; };
    ctx.font = "12px sans-serif"; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.lineWidth = 1; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (var e = ya; e <= yb; e++) { var py = Math.round(Y(Math.pow(10, e))) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(e === 0 ? "1" : "10" + sup(e), l - 6, py); }
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    [3, 10, 30, 100, 300, 1000].forEach(function (q) { if (q > Math.pow(10, xb)) return; var px = Math.round(X(q)) + 0.5; ctx.beginPath(); ctx.moveTo(px, t); ctx.lineTo(px, t + h); ctx.stroke(); ctx.fillText(String(q), px, t + h + 6); });
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("grau kᵢ", P.w - r, P.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("componente vᵢ do autovetor de λ_max", l + 6, 0);
    /* a previsão do campo médio: v proporcional a k, com norma 1 */
    var nk = 0; for (i = 0; i < n; i++) nk += k[i] * k[i]; nk = Math.sqrt(nk);
    ctx.strokeStyle = col.carac; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(X(2), Y(2 / nk)); ctx.lineTo(X(Math.pow(10, xb)), Y(Math.pow(10, xb) / nk)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = col.choque; ctx.globalAlpha = 0.45;
    var jit = E.rng(3);
    for (i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(X(k[i] * (1 + 0.12 * (jit() - 0.5))), Y(v[i]), 1.8, 0, 6.2832); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function sup(e) { var m = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" }; return String(e).split("").map(function (c) { return m[c]; }).join(""); }
  function drawPrev(col) {
    var P = setup(cP), ctx = P.ctx, l = 48, r = 12, t = 18, b = 30, w = P.w - l - r, h = P.h - t - b;
    var xa = log10(rede.xmin), xb = log10(rede.xmax), ya = -5, yb = 0;
    var X = function (q) { return l + (log10(q) - xa) / (xb - xa) * w; }, Y = function (q) { return t + (1 - (log10(Math.max(q, 1e-5)) - ya) / (yb - ya)) * h; };
    ctx.font = "12px sans-serif"; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.lineWidth = 1; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (var e = ya; e <= yb; e++) { var py = Math.round(Y(Math.pow(10, e))) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(e === 0 ? "1" : "10" + sup(e), l - 6, py); }
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    [0.003, 0.01, 0.03, 0.1, 0.3, 1].forEach(function (q) { if (q < rede.xmin || q > rede.xmax) return; var px = Math.round(X(q)) + 0.5; ctx.beginPath(); ctx.moveTo(px, t); ctx.lineTo(px, t + h); ctx.stroke(); ctx.fillText(fmt(q, q < 0.01 ? 3 : 2), px, t + h + 6); });
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("β/μ (escala log)", P.w - r, P.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("fração infectada no equilíbrio", l + 6, 0);
    function vert(x, c, dash) { ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(X(x), t); ctx.lineTo(X(x), t + h); ctx.stroke(); ctx.setLineDash([]); }
    vert(1 / rede.lam, col.choque, [5, 4]); vert(1 / rede.kap, col.carac, [5, 4]);
    function linha(c, cor, tr) {
      ctx.strokeStyle = cor; ctx.fillStyle = cor; ctx.lineWidth = 2; ctx.setLineDash(tr ? [6, 4] : []);
      ctx.beginPath(); c.forEach(function (q, j) { if (j) ctx.lineTo(X(q[0]), Y(q[1])); else ctx.moveTo(X(q[0]), Y(q[1])); }); ctx.stroke(); ctx.setLineDash([]);
      if (!tr) c.forEach(function (q) { ctx.beginPath(); ctx.arc(X(q[0]), Y(q[1]), 2.5, 0, 6.2832); ctx.fill(); });
    }
    linha(curvaHMF, col.carac, true); linha(curva, col.choque, false);
    if (curva.length < PONTOS) { ctx.fillStyle = col.soft; ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillText("calculando… " + curva.length + "/" + PONTOS, l + w - 4, t + 4); }
  }

  function draw() {
    if (!rede) return;
    var col = colors();
    oG.textContent = fmt(parseFloat(rG.value), 2);
    drawVet(col); drawPrev(col);
    read.innerHTML = "<span>n = " + rede.n + " · ⟨k⟩ = <b>" + fmt(rede.m1) + "</b> · ⟨k²⟩/⟨k⟩ = <b>" + fmt(rede.kap) + "</b> · √k_max = <b>" + fmt(Math.sqrt(rede.km)) + "</b> (k_max = " + rede.km + ") · λ_max = <b>" + fmt(rede.lam) + "</b></span>" +
      "<span>limiar na rede fixa: β/μ &gt; 1/λ_max = <b>" + fmt(1 / rede.lam, 4) + "</b> · pelas classes de grau: β/μ &gt; ⟨k⟩/⟨k²⟩ = <b>" + fmt(1 / rede.kap, 4) + "</b></span>" +
      "<span>o autovetor está espalhado, na prática, por <b>" + Math.round(rede.efetivos) + "</b> vértices (1/Σvᵢ⁴), de " + rede.n + "</span>";
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  rG.addEventListener("input", function () { oG.textContent = fmt(parseFloat(rG.value), 2); clearTimeout(timer); timer = setTimeout(sorteia, 250); });
  sN.addEventListener("change", sorteia);
  bNova.addEventListener("click", function () { semente++; sorteia(); });
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);
  sorteia();
})();
