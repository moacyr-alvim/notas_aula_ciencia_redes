/* Demo da página "O limiar epidêmico por classes de grau".
 * SIS por classe de grau (equações de diferenças), comparado com o SIS clássico de mesmo ⟨k⟩.
 * Esquerda: fração infectada ao longo do tempo.  Direita: i_k contra k no passo escolhido.
 * Depende de epi-core.js. */
(function () {
  "use strict";
  var E = window.EpiCore, root = document.getElementById("demo-lim");
  if (!E || !root) return;

  var $ = function (id) { return document.getElementById(id); };
  var sFam = $("l-fam"), rG = $("l-gama"), oG = $("l-gamav"), rB = $("l-beta"), oB = $("l-betav"), rM = $("l-mu"), oM = $("l-muv"),
      rT = $("l-t"), oT = $("l-tv"), cLog = $("l-log"), read = $("l-readout"), cC = $("l-curva-canvas"), cK = $("l-k-canvas");
  var T = 150, I0 = 1e-3, KMIN = 3, KMAX = 300, raf = 0, est = null;

  function fmt(x, d) { return x.toFixed(d == null ? 2 : d).replace(".", ",").replace("-", "−"); }
  function pct(x) { return x < 0.001 ? "menos de 0,1%" : fmt(100 * x, 1) + "%"; }
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function colors() { return { ink: css("--ink"), soft: css("--ink-soft"), rule: css("--rule"), carac: css("--carac"), choque: css("--choque") }; }
  function setup(canvas) {
    var dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    var ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }
  function dist() {
    if (sFam.value === "poisson") return E.poisson(6, 40);
    if (sFam.value === "regular") return E.regularDist(6);
    return E.leiPotencia(parseFloat(rG.value), KMIN, KMAX);
  }

  function calcula() {
    var p = dist(), beta = parseFloat(rB.value), mu = parseFloat(rM.value), m1 = E.momento(p, 1), m2 = E.momento(p, 2);
    var het = E.serieSISgrau(p, I0, beta, mu, T);
    var hom = E.serie(E.passoExato, I0, beta, m1, mu, T);
    est = { p: p, beta: beta, mu: mu, m1: m1, kap: m2 / m1, het: het, tot: het.map(function (i) { return E.media(p, i); }), hom: hom };
  }

  function drawCurva(col, t) {
    var P = setup(cC), ctx = P.ctx, l = 46, r = 12, t0 = 16, b = 30, w = P.w - l - r, h = P.h - t0 - b, lg = cLog.checked;
    var lo = 1e-4, Y = lg ? function (v) { return t0 + (1 - (Math.log10(Math.max(v, lo)) - Math.log10(lo)) / -Math.log10(lo)) * h; } : function (v) { return t0 + (1 - v) * h; };
    var X = function (s) { return l + s / T * w; };
    ctx.font = "12px sans-serif"; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.lineWidth = 1; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    (lg ? [1e-4, 1e-3, 1e-2, 1e-1, 1] : [0, 0.25, 0.5, 0.75, 1]).forEach(function (v) { var py = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(lg ? (v >= 0.01 ? fmt(v, v >= 1 ? 0 : 2) : "10" + (v === 1e-3 ? "⁻³" : "⁻⁴")) : fmt(v), l - 6, py); });
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (var s = 0; s <= T; s += 30) { var px = Math.round(X(s)) + 0.5; ctx.beginPath(); ctx.moveTo(px, t0); ctx.lineTo(px, t0 + h); ctx.stroke(); ctx.fillText(String(s), px, t0 + h + 6); }
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("passo t", P.w - r, P.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("fração infectada", l + 6, 0);
    function linha(v, c, tr) { ctx.strokeStyle = c; ctx.lineWidth = 2.2; ctx.setLineDash(tr ? [6, 4] : []); ctx.beginPath(); v.forEach(function (y, j) { if (j) ctx.lineTo(X(j), Y(y)); else ctx.moveTo(X(j), Y(y)); }); ctx.stroke(); ctx.setLineDash([]); }
    linha(est.hom, col.carac, true); linha(est.tot, col.choque, false);
    ctx.strokeStyle = col.ink; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(X(t), t0); ctx.lineTo(X(t), t0 + h); ctx.stroke(); ctx.setLineDash([]);
  }
  function drawK(col, t) {
    var P = setup(cK), ctx = P.ctx, l = 46, r = 12, t0 = 16, b = 30, w = P.w - l - r, h = P.h - t0 - b, i = est.het[t], p = est.p;
    var kmax = p.length - 1, la = Math.log10(1), lb = Math.log10(Math.max(kmax, 10));
    var X = function (k) { return l + (Math.log10(k) - la) / (lb - la) * w; }, Y = function (v) { return t0 + (1 - v) * h; };
    ctx.font = "12px sans-serif"; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.lineWidth = 1; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) { var py = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(fmt(v), l - 6, py); });
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    [1, 3, 10, 30, 100, 300].forEach(function (k) { if (k > Math.max(kmax, 10)) return; var px = Math.round(X(k)) + 0.5; ctx.beginPath(); ctx.moveTo(px, t0); ctx.lineTo(px, t0 + h); ctx.stroke(); ctx.fillText(String(k), px, t0 + h + 6); });
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("grau k (escala log)", P.w - r, P.h - 2);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("fração infectada entre os de grau k, iₖ", l + 6, 0);
    var hom = est.hom[t], py = Y(hom); ctx.strokeStyle = col.carac; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = col.choque;
    for (var k = 1; k <= kmax; k++) if (p[k] > 1e-7) { ctx.beginPath(); ctx.arc(X(k), Y(i[k]), k > 40 ? 2 : 3, 0, 6.2832); ctx.fill(); }
  }

  function draw() {
    var t = parseInt(rT.value, 10), col = colors(), R0h = est.beta * est.m1 / est.mu, R0 = est.beta * est.kap / est.mu;
    oT.textContent = t; oB.textContent = fmt(est.beta, 3); oM.textContent = fmt(est.mu, 2); oG.textContent = fmt(parseFloat(rG.value), 2);
    rG.disabled = sFam.value !== "potencia";
    drawCurva(col, t); drawK(col, t);
    var r = 1 - est.mu + est.beta * est.kap;
    read.innerHTML = "<span>⟨k⟩ = <b>" + fmt(est.m1) + "</b> · ⟨k²⟩/⟨k⟩ = <b>" + fmt(est.kap) + "</b> · limiar: β/μ &gt; ⟨k⟩/⟨k²⟩ = <b>" + fmt(1 / est.kap, 4) + "</b> (agora β/μ = " + fmt(est.beta / est.mu, 4) + ")</span>" +
      "<span>sem olhar a rede, βk/μ com k = ⟨k⟩: <b>" + fmt(R0h) + "</b> · com os graus, R₀ = β⟨k²⟩/(μ⟨k⟩) = <b>" + fmt(R0) + "</b> → " + (R0 > 1 ? "<b>a epidemia se instala</b>" : "<b>a epidemia some</b>") + " · razão no começo r = " + fmt(r, 3) + "</span>" +
      "<span>no passo " + t + ": infectados " + pct(est.tot[t]) + " (equação sem graus: " + pct(est.hom[t]) + ")</span>";
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }
  function refaz() { calcula(); schedule(); }

  [sFam, rG, rB, rM].forEach(function (el) { el.addEventListener(el === sFam ? "change" : "input", refaz); });
  [rT, cLog].forEach(function (el) { el.addEventListener(el === cLog ? "change" : "input", schedule); });
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);
  refaz();
})();
