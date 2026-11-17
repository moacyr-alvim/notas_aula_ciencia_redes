/* Demo da página "O modelo SIR": as frações s, i, r ao longo dos passos, pela equação de diferenças,
 * com o pico marcado, a linha s = 1/R₀ e, opcionalmente, o SIS com os mesmos parâmetros.  Depende de epi-core.js. */
(function () {
  "use strict";
  var E = window.EpiCore, root = document.getElementById("demo-sir");
  if (!E || !root) return;

  var $ = function (id) { return document.getElementById(id); };
  var rB = $("r-beta"), oB = $("r-betav"), rK = $("r-k"), oK = $("r-kv"), rM = $("r-mu"), oM = $("r-muv"),
      cSIS = $("r-sis"), read = $("r-readout"), cv = $("r-canvas");
  var I0 = 0.001, raf = 0;

  function fmt(x, d) { return x.toFixed(d == null ? 2 : d).replace(".", ",").replace("-", "−"); }
  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function colors() { return { ink: css("--ink"), soft: css("--ink-soft"), rule: css("--rule"), carac: css("--carac"), choque: css("--choque"), paper: css("--paper") }; }
  function setup(canvas) {
    var dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    var ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }

  function draw() {
    var beta = parseFloat(rB.value), k = parseInt(rK.value, 10), mu = parseFloat(rM.value), R0 = beta * k / mu, col = colors();
    oB.textContent = fmt(beta, 3); oK.textContent = String(k); oM.textContent = fmt(mu, 2);
    // horizonte: até a epidemia praticamente acabar (ou 600 passos)
    var S = E.serieSIR(I0, beta, k, mu, 2000), T = 60;
    for (var t = 1; t < S.length; t++) if (S[t][1] > 1e-4 || t < 10) T = t; else break;
    T = Math.min(600, Math.max(60, Math.ceil(T * 1.1)));
    S = S.slice(0, T + 1);
    var sis = E.serie(E.passoClassico, I0, beta, k, mu, T), tp = 0;
    S.forEach(function (x, j) { if (x[1] > S[tp][1]) tp = j; });

    var P = setup(cv), ctx = P.ctx, l = 42, r = 14, tpd = 16, b = 30, w = P.w - l - r, h = P.h - tpd - b;
    var X = function (tv) { return l + tv / T * w; }, Y = function (v) { return tpd + (1 - v) * h; };
    ctx.font = "12px sans-serif"; ctx.strokeStyle = col.rule; ctx.fillStyle = col.soft; ctx.lineWidth = 1; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) { var py = Math.round(Y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(l + w, py); ctx.stroke(); ctx.fillText(fmt(v), l - 6, py); });
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    var st = T <= 80 ? 10 : T <= 200 ? 25 : T <= 400 ? 50 : 100;
    for (var tv = 0; tv <= T; tv += st) { var px = Math.round(X(tv)) + 0.5; ctx.beginPath(); ctx.moveTo(px, tpd); ctx.lineTo(px, tpd + h); ctx.stroke(); ctx.fillText(String(tv), px, tpd + h + 6); }
    ctx.fillStyle = col.ink; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("passo t", P.w - r, P.h - 2);
    ctx.save(); ctx.beginPath(); ctx.rect(l, tpd - 2, w, h + 4); ctx.clip(); ctx.lineJoin = "round";
    function linha(v, cor, lw, dash) { ctx.strokeStyle = cor; ctx.lineWidth = lw; ctx.setLineDash(dash || []); ctx.beginPath(); v.forEach(function (x, j) { if (j) ctx.lineTo(X(j), Y(x)); else ctx.moveTo(X(j), Y(x)); }); ctx.stroke(); ctx.setLineDash([]); }
    if (R0 > 1) {   // s = 1/R₀ e o pico
      ctx.strokeStyle = col.carac; ctx.globalAlpha = 0.6; ctx.setLineDash([2, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(l, Y(1 / R0)); ctx.lineTo(l + w, Y(1 / R0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(tp), tpd); ctx.lineTo(X(tp), tpd + h); ctx.stroke(); ctx.globalAlpha = 1; ctx.setLineDash([]);
    }
    if (cSIS.checked) linha(sis, col.choque, 1.5, [6, 4]);
    linha(S.map(function (x) { return x[0]; }), col.carac, 2.4);
    linha(S.map(function (x) { return x[2]; }), col.ink, 2, [1, 0]);
    linha(S.map(function (x) { return x[1]; }), col.choque, 2.8);
    if (R0 > 1) { ctx.fillStyle = col.choque; ctx.beginPath(); ctx.arc(X(tp), Y(S[tp][1]), 4.5, 0, 6.2832); ctx.fill(); }
    ctx.restore();

    read.innerHTML = "<span>R₀ = β⟨k⟩/μ = <b>" + fmt(R0) + "</b> · razão no começo r = 1 − μ + β⟨k⟩ = <b>" + fmt(1 - mu + beta * k, 3) + "</b> (as mesmas do SIS)</span>" +
      (R0 > 1
        ? "<span>pico no passo <b>" + tp + "</b> · nele, suscetíveis s = <b>" + fmt(S[tp][0], 3) + "</b> ≈ 1/R₀ = <b>" + fmt(1 / R0, 3) + "</b></span>" +
          "<span>imunidade de rebanho: <b>" + fmt(100 * (1 - 1 / R0), 0) + "%</b> imunes antes de a doença chegar impedem a epidemia · no fim, nunca pegaram a doença: <b>" + fmt(100 * S[T][0], 1) + "%</b></span>"
        : "<span>R₀ ≤ 1: não há pico, os poucos casos iniciais somem</span>");
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }
  [rB, rK, rM].forEach(function (x) { x.addEventListener("input", schedule); });
  cSIS.addEventListener("change", schedule);
  window.addEventListener("resize", schedule);
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(root);
  document.addEventListener("themechange", schedule);
  draw();
})();
