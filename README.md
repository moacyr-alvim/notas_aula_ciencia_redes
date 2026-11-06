# O laplaciano em redes — site

Notas para a disciplina de ciência de redes, no mesmo formato das
[notas de EDP](https://moacyr-alvim.github.io/notas_aula_edp/): um mapa de conceitos na página inicial,
páginas curtas com demos interativas e células de Python que rodam **no navegador** (Pyodide), sem servidor.

## Ver no seu computador

O Python no navegador usa um Web Worker, que não funciona abrindo o arquivo direto do disco.
Sirva a pasta com um servidor local:

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Publicar no GitHub Pages

1. Crie um repositório e envie esta pasta (o conteúdo dela na raiz do repositório):

   ```bash
   git init && git add . && git commit -m "Primeira versão do site"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   git push -u origin main
   ```

2. No GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   O arquivo `.github/workflows/pages.yml` roda os testes e publica a cada `push` na `main`.

3. O endereço fica `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`.

Fórmulas (KaTeX) e Pyodide vêm do CDN jsDelivr; sem internet, nem fórmulas nem Python aparecem.
A primeira execução de Python em cada visita baixa o Pyodide (10 a 20 MB, depois fica no cache).

## Estrutura

```
index.html            mapa de conceitos (página inicial)
paginas/              uma página por tópico (HTML escrito à mão)
  difusao.html        difusão em redes: u' = −cLu, L = D − A, a solução modo a modo
py/                   os códigos das células de Python (difusao_lacunas.py / difusao_solucao.py)
assets/
  style.css           visual (claro/escuro automático) — o mesmo das notas de EDP
  site.js             tema, índice lateral, fórmulas
  mapa.js             dados e desenho do mapa (nós, setas, percursos)
  pyrunner.js         células de Python editáveis
  pyworker.js         Web Worker com Pyodide; baixa sozinho os pacotes que o código importa (networkx, scipy...)
  redes-core.js       L = D − A, autovalores (Jacobi), evolução modo a modo e o catálogo de redes da demo
                      (caminho, anel, estrela, grade, dois grupos, clube de caratê); testável em Node
  difusao-demo.js     desenho da demo de difusão
tests/                testes (veja abaixo)
```

## Como acrescentar

**Uma página nova**: copie `paginas/difusao.html`, escreva, e no `assets/mapa.js` troque `href: null`
do nó correspondente pelo caminho da página. Acrescente a página na lista "Disponível agora" do `index.html`.
O índice lateral é gerado dos `<h2 id="...">`.

**Uma célula de Python**:

```html
<div class="pycell" data-title="Título da célula"
     data-starter="../py/meu_codigo.py"
     data-solution="../py/meu_codigo_solucao.py"></div>
...
<script src="../assets/pyrunner.js"></script>
```

`data-solution` é opcional (vira o bloco "Ver solução"). `plt.show()` mostra a figura embaixo da célula.
Qualquer pacote do Pyodide que o código importe (por exemplo `networkx`) é baixado na hora.

**Fórmulas**: `$...$` (na linha) e `$$...$$` (em bloco). Dentro do HTML, escreva `&lt;` no lugar de `<`.

**Uma rede nova na demo**: acrescente uma entrada em `REDES` no `assets/redes-core.js`
(`n`, `edges` e `pos` em [0,1]²). Os testes passam a cobri-la automaticamente.

## Cache dos arquivos

O GitHub Pages deixa os arquivos em cache por alguns minutos. Para o navegador não misturar uma página nova
com um script velho, as páginas pedem `assets/arquivo.js?v=<hash>`. Depois de mexer em qualquer arquivo de
`assets/`, rode `python3 tests/carimbar_versoes.py` antes do commit; `tests/check_site.py` (que roda no GitHub)
falha se algum carimbo estiver desatualizado.

## Testes

```bash
node tests/redes-core.test.js       # L = D − A, autopares, conservação, princípio do máximo, Runge–Kutta, valores citados no texto
python3 tests/run_python_cells.py   # roda os py/*.py como o worker faz (precisa de numpy, matplotlib e networkx)
python3 tests/check_site.py         # links, âncoras, ids, tags e fórmulas
```

O que **não** é coberto: a renderização real no navegador e o carregamento do Pyodide pelo CDN.
Vale abrir cada página uma vez depois de publicar.

## Sobre os dados

`dados/gama.txt`: tribos Gahuku-Gama (Read, 1954), duas matrizes 16 × 16 empilhadas, primeiro a de alianças
(positiva) e depois a de hostilidades (negativa). A ordem das tribos é GAVEV, KOTUN, OVE, ALIKA, NAGAM, GAHUK,
MASIL, UKUDZ, NOTOH, KOHIK, GEHAM, ASARO, UHETO, SEUVE, NAGAD, GAMA. Os testes conferem que a célula de Python e a
demo usam exatamente esses dados.

## Sobre o clube de caratê

A demo e a célula de Python usam a rede de Zachary (1977) **sem pesos**, como em `nx.karate_club_graph()`
com `weight=None`. As posições dos vértices na demo são de `nx.kamada_kawai_layout`.
