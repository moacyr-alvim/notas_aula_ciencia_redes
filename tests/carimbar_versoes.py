"""Põe ?v=<hash curto do conteúdo> nas referências a assets/*.js e assets/*.css de todas as páginas.

Uso:  python3 tests/carimbar_versoes.py
Assim, quando um script muda, o navegador baixa a versão nova em vez de usar a do cache (o GitHub Pages
guarda os arquivos em cache por alguns minutos). Rode antes de cada commit que mexa em assets/.
"""
import hashlib, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
def h(p): return hashlib.sha1(p.read_bytes()).hexdigest()[:8]
pat = re.compile(r'((?:src|href)="((?:\.\./)?assets/[^"?#]+\.(?:js|css)))(\?v=[0-9a-f]+)?"')
for f in [root / "index.html", *sorted((root / "paginas").glob("*.html"))]:
    s = f.read_text(encoding="utf-8")
    novo = pat.sub(lambda m: f'{m.group(1)}?v={h((f.parent / m.group(2)).resolve())}"', s)
    if novo != s:
        f.write_text(novo, encoding="utf-8"); print("carimbado:", f.relative_to(root))
