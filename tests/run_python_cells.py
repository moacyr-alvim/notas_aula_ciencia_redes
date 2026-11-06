"""Roda todos os arquivos de py/ do jeito que o worker faz (mesmo PRELUDE do pyworker.js).

Uso:  python3 tests/run_python_cells.py      (precisa de numpy, matplotlib e networkx)
Verifica: cada arquivo executa sem erro, gera figuras PNG válidas e (nas soluções) os números esperados.
"""
import base64, contextlib, io, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
js = (root / "assets" / "pyworker.js").read_text(encoding="utf-8")
prelude = re.search(r"const PRELUDE = `(.*?)`;", js, re.S).group(1)
pre_ns = {}
exec(prelude, pre_ns)                      # igual ao pyodide.runPython(PRELUDE)

fails = 0
def check(name, ok, info=""):
    global fails
    print(("ok   " if ok else "FALHA"), name, info)
    fails += (not ok)

def rodar(nome):
    code = (root / "py" / nome).read_text(encoding="utf-8")
    ns = {"__name__": "__main__"}
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(compile(code, "<exec>", "exec"), ns)
    return buf.getvalue(), pre_ns["_take_figs"]()

for nome in sorted(p.name for p in (root / "py").glob("*.py")):
    saida, figs = rodar(nome)
    png_ok = bool(figs) and all(base64.b64decode(f)[:8] == b"\x89PNG\r\n\x1a\n" for f in figs)
    check(f"{nome}: executa e gera figura PNG", png_ok, f"({len(figs)} fig)")

# difusão no caratê
s, _ = rodar("difusao_solucao.py")
check("difusão: graus e linhas de L conferem", "graus conferem com o networkx? True" in s and "linhas de L somam zero? True" in s)
lam = [float(x) for x in re.search(r"menores autovalores: \[([^\]]*)\]", s).group(1).split()]
check("difusão: λ₂ ≈ 0,4685", abs(lam[1] - 0.4685) < 1e-4, str(lam))
somas = [float(x) for x in re.findall(r"soma = ([0-9.]+)", s)]
maiores = [float(x) for x in re.findall(r"maior = ([0-9.]+)", s)]
check("difusão: soma sempre 1", all(abs(x - 1) < 1e-4 for x in somas), str(somas))
check("difusão: o maior valor só desce", all(a >= b for a, b in zip(maiores, maiores[1:])), str(maiores))
s, _ = rodar("difusao_lacunas.py")
check("difusão (lacunas): roda e avisa que ainda falta completar", "graus conferem com o networkx? False" in s and "linhas de L somam zero? False" in s)

print("\nfalhas:", fails)
sys.exit(1 if fails else 0)
