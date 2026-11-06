/* Mapa de conceitos (estilo "mapa de metrô"): raias = temas, setas = "ajuda a ler antes".
 * Para acrescentar uma página: troque `href: null` do nó correspondente pelo caminho da página.
 * A função renderSVG é pura (devolve texto) — roda também no Node, para testes.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Mapa = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var LANES = [
    { id: "din",   label: "Dinâmicas\nna rede" },
    { id: "esp",   label: "Espectro e\nestrutura" },
    { id: "pas",   label: "Passeios\naleatórios" },
    { id: "sin",   label: "Redes com\nsinais" }
  ];

  var TRAILS = [
    { id: "basico",   label: "Primeiro contato" },
    { id: "dinamica", label: "Dinâmicas" },
    { id: "espectro", label: "Espectro e comunidades" },
    { id: "passeios", label: "Passeios aleatórios" },
    { id: "sinais",   label: "Redes com sinais" }
  ];

  // href: null  =>  "em breve"
  var NODES = [
    { id: "difusao", lane: "din", col: 0, label: "Difusão\nem redes", href: "paginas/difusao.html", trails: ["basico", "dinamica", "espectro", "passeios"],
      desc: "Do desnível em cada laço ao passo u ← u − cLu, com L = BᵀB pela matriz de incidência: positividade de graça, escolha do passo, princípio do máximo e os modos. Demo com o clube de caratê e Python." },
    { id: "consenso", lane: "din", col: 1, label: "Consenso\n(DeGroot)", href: null, trails: ["dinamica"],
      desc: "A iteração u ← Wu com pesos quaisquer: cada um passa a ser uma média ponderada de quem escuta, inclusive em redes dirigidas. Quando há consenso, quão depressa e qual opinião vence." },
    { id: "sincr", lane: "din", col: 2, label: "Sincronização\n(Kuramoto)", href: null, trails: ["dinamica"],
      desc: "Osciladores acoplados pela rede. Perto da sincronia, a dinâmica linearizada é a difusão com o laplaciano." },
    { id: "comp", lane: "esp", col: 1, label: "Componentes\ne gargalos", href: "paginas/componentes.html", trails: ["basico", "espectro"],
      desc: "O autovalor 0 conta os pedaços da rede; o quociente de Rayleigh e a cota do gargalo mostram por que um λ₂ pequeno denuncia uma rede quase partida. Demo de cortar laços e Python." },
    { id: "fiedler", lane: "esp", col: 2, label: "Comunidades pelo\nvetor de Fiedler", href: "paginas/fiedler.html", trails: ["basico", "espectro"],
      desc: "A bisseção escrita com ±1, relaxada até virar o autovetor q₂, e arredondada pelo sinal, pela mediana ou por varredura. O caratê e o modelo de blocos. Demo e Python." },
    { id: "desenho", lane: "esp", col: 3, label: "Desenhar a rede\ncom autovetores", href: null, trails: ["espectro"],
      desc: "Coordenadas tiradas dos autovetores de menores autovalores: o desenho que minimiza o comprimento dos laços." },
    { id: "modos", lane: "esp", col: 1, row: 1, label: "Anel, grade e\nos modos da rede", href: null, trails: ["espectro"],
      desc: "Nas redes regulares os autovetores são ondas (Fourier). Em redes quaisquer, são as \"ondas\" possíveis daquela rede." },
    { id: "passeio", lane: "pas", col: 1, label: "Passeio aleatório\ne L normalizado", href: null, trails: ["passeios"],
      desc: "Um caminhante que pula para um vizinho ao acaso. A distribuição dele obedece a uma difusão com D⁻¹L, e o equilíbrio pesa pelo grau." },
    { id: "pagerank", lane: "pas", col: 2, label: "PageRank e\nredes dirigidas", href: null, trails: ["passeios"],
      desc: "O passeio com teletransporte numa rede dirigida e o vetor estacionário como medida de importância." },
    { id: "resist", lane: "pas", col: 3, label: "Circuitos e\nresistência efetiva", href: null, trails: ["passeios"],
      desc: "A rede como circuito elétrico: a pseudoinversa de L, a resistência entre dois vértices e o tempo de ida e volta do caminhante." }
  ];

  NODES.push(
    { id: "sinais", lane: "sin", col: 0, label: "Redes com sinais\ne equilíbrio", href: "paginas/sinais.html", trails: ["sinais"],
      desc: "Laços positivos e negativos, as tríades de Heider, equilíbrio por ciclos e o teorema de estrutura de Harary (equilibrada ⇔ agrupável em dois), com prova pela árvore geradora. As tribos Gahuku-Gama. Demo e Python." },
    { id: "lapsinal", lane: "sin", col: 1, label: "Laplaciano\ncom sinais", href: "paginas/lapsinal.html", trails: ["sinais"],
      desc: "A incidência com sinais (dois +1 no laço negativo), L = BᵀB = D̄ − A_σ, o teorema λ₁ = 0 ⇔ equilibrada, a troca de sinais como mudança de base, λ₁ como conflito algébrico e as opiniões que polarizam ou se apagam. Demo e Python." },
    { id: "frustr", lane: "sin", col: 2, label: "Quão longe\ndo equilíbrio", href: null, trails: ["sinais"],
      desc: "O índice de frustração, por que calculá-lo é difícil, e o menor autovalor do laplaciano com sinais como cota e como aproximação." },
    { id: "davis", lane: "sin", col: 1, row: 1, label: "Equilíbrio fraco\n(Davis)", href: null, trails: ["sinais"],
      desc: "Aceitar a tríade − − − e permitir mais de dois grupos: agrupável em k grupos ⇔ nenhum ciclo com exatamente um laço negativo." }
  );

  var EDGES = [
    ["difusao", "consenso"], ["consenso", "sincr"],
    ["difusao", "comp"], ["comp", "fiedler"], ["fiedler", "desenho"], ["difusao", "modos"], ["modos", "desenho"],
    ["difusao", "passeio"], ["passeio", "pagerank"], ["passeio", "resist"],
    ["sinais", "lapsinal"], ["difusao", "lapsinal"], ["lapsinal", "frustr"], ["sinais", "davis"]
  ];

  // geometria
  var G = { nodeW: 158, nodeH: 44, colStep: 208, laneH: 88, rowStep: 56, padLeft: 150, padTop: 14, padRight: 14, padBottom: 14 };

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  function layout() {
    var y = G.padTop, lanes = {}, cols = 0;
    LANES.forEach(function (l) {
      var rows = 1;
      NODES.forEach(function (n) { if (n.lane === l.id) rows = Math.max(rows, (n.row || 0) + 1); });
      var h = G.laneH + (rows - 1) * G.rowStep;
      lanes[l.id] = { y: y, h: h, rows: rows, label: l.label };
      y += h;
    });
    NODES.forEach(function (n) { cols = Math.max(cols, n.col + 1); });
    var pos = {};
    NODES.forEach(function (n) {
      var L = lanes[n.lane];
      var cy = L.y + G.laneH / 2 + (n.row || 0) * G.rowStep;
      pos[n.id] = { x: G.padLeft + n.col * G.colStep, y: cy - G.nodeH / 2, cy: cy };
    });
    return { lanes: lanes, pos: pos, width: G.padLeft + (cols - 1) * G.colStep + G.nodeW + G.padRight, height: y + G.padBottom };
  }

  function byId(id) { for (var i = 0; i < NODES.length; i++) if (NODES[i].id === id) return NODES[i]; return null; }

  /* trilha: "all" ou id; devolve SVG como texto */
  function renderSVG(trail) {
    var L = layout(), out = [];
    var inTrail = function (n) { return trail === "all" || n.trails.indexOf(trail) >= 0; };
    out.push('<svg class="map" viewBox="0 0 ' + L.width + " " + L.height + '" width="' + L.width + '" height="' + L.height + '" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Mapa de conceitos">');
    out.push('<defs><marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" class="seta"/></marker></defs>');

    // raias
    LANES.forEach(function (l, i) {
      var a = L.lanes[l.id];
      out.push('<rect class="lane' + (i % 2 ? " alt" : "") + '" x="0" y="' + a.y + '" width="' + L.width + '" height="' + a.h + '"/>');
      var lines = l.label.split("\n");
      lines.forEach(function (t, k) {
        out.push('<text class="lane-label" x="14" y="' + (a.y + G.laneH / 2 + (k - (lines.length - 1) / 2) * 17 + 5) + '">' + esc(t) + "</text>");
      });
    });

    // setas
    EDGES.forEach(function (e) {
      var A = L.pos[e[0]], B = L.pos[e[1]], na = byId(e[0]), nb = byId(e[1]);
      var x1 = A.x + G.nodeW, y1 = A.cy, x2 = B.x - 2, y2 = B.cy, dx = (x2 - x1) / 2;
      var on = inTrail(na) && inTrail(nb);
      out.push('<path class="edge' + (on ? "" : " dim") + '" d="M' + x1 + "," + y1 + " C" + (x1 + dx) + "," + y1 + " " + (x2 - dx) + "," + y2 + " " + x2 + "," + y2 + '" marker-end="url(#seta)"/>');
    });

    // nós
    NODES.forEach(function (n) {
      var p = L.pos[n.id], ok = !!n.href, lines = n.label.split("\n");
      var cls = "node " + (ok ? "ok" : "soon") + (inTrail(n) ? "" : " dim");
      var inner = '<rect x="' + p.x + '" y="' + p.y + '" width="' + G.nodeW + '" height="' + G.nodeH + '" rx="6"/>';
      lines.forEach(function (t, k) {
        inner += '<text x="' + (p.x + G.nodeW / 2) + '" y="' + (p.cy + (k - (lines.length - 1) / 2) * 16 + 5) + '" text-anchor="middle">' + esc(t) + "</text>";
      });
      var label = lines.join(" ") + (ok ? "" : " (em breve)");
      if (ok) out.push('<a class="' + cls + '" href="' + esc(n.href) + '" data-id="' + n.id + '" aria-label="' + esc(label) + '">' + inner + "</a>");
      else out.push('<g class="' + cls + '" data-id="' + n.id + '" tabindex="0" role="img" aria-label="' + esc(label) + '">' + inner + "</g>");
    });
    out.push("</svg>");
    return out.join("");
  }

  /* ---------- parte que mexe na página (só no navegador) ---------- */
  function mount(opts) {
    var host = document.getElementById(opts.map), chips = document.getElementById(opts.chips),
        info = document.getElementById(opts.info), list = document.getElementById(opts.list);
    var trail = "all";

    function nodesOfTrail(t) {   // ordem topológica simples: por coluna e raia
      return NODES.filter(function (n) { return t === "all" || n.trails.indexOf(t) >= 0; });
    }

    function draw() {
      host.innerHTML = renderSVG(trail);
      chips.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.trail === trail)); });
      // lista textual do percurso (também serve de alternativa ao desenho)
      list.textContent = "";
      var t = TRAILS.filter(function (x) { return x.id === trail; })[0];
      if (t) {
        var h = document.createElement("p"); h.className = "trail-title"; h.textContent = "Percurso: " + t.label; list.appendChild(h);
        var ol = document.createElement("ol");
        nodesOfTrail(trail).slice().sort(function (a, b) { return a.col - b.col; }).forEach(function (n) {
          var li = document.createElement("li"), name = n.label.replace(/\n/g, " ");
          if (n.href) { var a = document.createElement("a"); a.href = n.href; a.textContent = name; li.appendChild(a); }
          else { li.textContent = name + " "; var s = document.createElement("span"); s.className = "soon"; s.textContent = "(em breve)"; li.appendChild(s); }
          ol.appendChild(li);
        });
        list.appendChild(ol);
      }
    }

    function describe(el) {
      var g = el && el.closest && el.closest("[data-id]");
      if (!g) return;
      var n = byId(g.getAttribute("data-id"));
      info.textContent = n.label.replace(/\n/g, " ") + " — " + n.desc + (n.href ? "" : " (página em breve)");
    }
    host.addEventListener("mouseover", function (e) { describe(e.target); });
    host.addEventListener("focusin", function (e) { describe(e.target); });

    var bAll = document.createElement("button");
    bAll.type = "button"; bAll.dataset.trail = "all"; bAll.textContent = "Tudo";
    chips.appendChild(bAll);
    TRAILS.forEach(function (t) {
      var b = document.createElement("button"); b.type = "button"; b.dataset.trail = t.id; b.textContent = t.label; chips.appendChild(b);
    });
    chips.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      trail = b.dataset.trail; draw();
    });
    draw();
  }

  return { LANES: LANES, TRAILS: TRAILS, NODES: NODES, EDGES: EDGES, G: G, layout: layout, renderSVG: renderSVG, mount: mount };
});
