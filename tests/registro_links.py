"""Gera LINKS.md: o registro de quais páginas apontam para quais.

Uso:  python3 tests/registro_links.py            (reescreve LINKS.md)
      python3 tests/registro_links.py --conferir  (só confere; sai com erro se LINKS.md estiver desatualizado)

Para cada página: o título, quem aponta para ela (com o texto de cada link, para achar o nome antigo
quando a página for renomeada) e para onde ela aponta. Também lista as setas do mapa de conceitos e os
links para fora do site. Links para páginas que não existem já são apanhados por tests/check_site.py.
"""
import json, pathlib, re, subprocess, sys
from collections import defaultdict
from html.parser import HTMLParser

root = pathlib.Path(__file__).resolve().parent.parent
SAIDA = root / "LINKS.md"


class Links(HTMLParser):
    """Coleta os <a href> (com o texto visível), o <title> e o <h1>."""
    def __init__(self):
        super().__init__(); self.links = []; self._a = None; self._txt = []; self.title = ""; self.h1 = ""; self._em = None; self._span = 0
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "a" and "href" in a: self._a = a["href"]; self._txt = []
        if tag in ("title", "h1"): self._em = tag
        if tag == "span" and self._a is not None: self._span += 1   # na página inicial, o <span> é a descrição
    def handle_endtag(self, tag):
        if tag == "a" and self._a is not None:
            self.links.append((self._a, re.sub(r"\s+", " ", "".join(self._txt)).strip())); self._a = None
        if tag == self._em: self._em = None
        if tag == "span" and self._span: self._span -= 1
    def handle_data(self, d):
        if self._a is not None and not self._span: self._txt.append(d)
        if self._em == "title": self.title += d
        if self._em == "h1": self.h1 += d


def paginas():
    return [root / "index.html"] + sorted((root / "paginas").glob("*.html"))


def rel(p):
    return p.relative_to(root).as_posix()


def gerar():
    info, entra, sai, fora = {}, defaultdict(list), defaultdict(list), defaultdict(set)
    for p in paginas():
        L = Links(); L.feed(p.read_text(encoding="utf-8"))
        info[rel(p)] = (L.h1.strip() or L.title.split("—")[0].strip())
        for href, txt in L.links:
            if re.match(r"(https?:|mailto:)", href):
                fora[rel(p)].add(href); continue
            if href.startswith("#"):
                continue                               # âncora na própria página
            alvo, _, ancora = href.partition("#")
            destino = rel((p.parent / alvo).resolve()) if alvo else rel(p)
            sai[rel(p)].append((destino, ancora, txt))
            entra[destino].append((rel(p), ancora, txt))

    # setas do mapa de conceitos (assets/mapa.js), traduzidas para páginas
    js = "const M=require('./assets/mapa.js');console.log(JSON.stringify({n:M.NODES.map(x=>[x.id,x.href,x.label]),e:M.EDGES}))"
    mapa = json.loads(subprocess.run(["node", "-e", js], cwd=root, capture_output=True, text=True, check=True).stdout)
    no = {i: (h, lab.replace("\n", " ")) for i, h, lab in mapa["n"]}
    rotulo = {h: lab.replace("\n", " ") for _, h, lab in mapa["n"] if h}

    out = ["# Registro de links entre as páginas", "",
           "Gerado por `python3 tests/registro_links.py`; não edite à mão. O teste do GitHub falha se este",
           "arquivo ficar desatualizado. Ao renomear ou mover uma página, procure aqui quem aponta para ela e",
           "com que texto, e confira também o rótulo no mapa (`assets/mapa.js`) e a lista da página inicial.", ""]
    out += ["## Páginas", ""]
    for pg in [rel(p) for p in paginas()]:
        out.append(f"### {info[pg]} (`{pg}`)")
        out.append("")
        if pg in rotulo:
            out.append(f"**No mapa:** “{rotulo[pg]}”")
            out.append("")
        ent = sorted(set(e for e in entra.get(pg, []) if e[0] != pg))
        out.append(f"**Quem aponta para ela** ({len(ent)}):" if ent else "**Quem aponta para ela:** ninguém.")
        for origem, anc, txt in ent:
            out.append(f"- `{origem}`" + (f" → `#{anc}`" if anc else "") + f": “{txt}”")
        s = sorted(set((d, a) for d, a, _ in sai.get(pg, []) if d != pg))
        if s:
            out.append("")
            out.append("**Aponta para:** " + ", ".join(f"`{d}`" + (f"#{a}" if a else "") for d, a in s))
        if fora.get(pg):
            out.append("")
            out.append("**Links para fora do site:** " + ", ".join(sorted(fora[pg])))
        out.append("")
    out += ["## Setas do mapa de conceitos", "", "| de | para |", "|---|---|"]
    for a, b in mapa["e"]:
        fa = f"{no[a][1]}" + (f" (`{no[a][0]}`)" if no[a][0] else " (em breve)")
        fb = f"{no[b][1]}" + (f" (`{no[b][0]}`)" if no[b][0] else " (em breve)")
        out.append(f"| {fa} | {fb} |")
    out.append("")
    return "\n".join(out)


if __name__ == "__main__":
    texto = gerar()
    if "--conferir" in sys.argv:
        ok = SAIDA.exists() and SAIDA.read_text(encoding="utf-8") == texto
        print(("ok   " if ok else "FALHA"), "LINKS.md atualizado", "" if ok else "(rode python3 tests/registro_links.py)")
        sys.exit(0 if ok else 1)
    SAIDA.write_text(texto, encoding="utf-8")
    print("escrito:", SAIDA.relative_to(root))
