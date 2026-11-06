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

# difusão no caratê, em passos
s, _ = rodar("difusao_solucao.py")
check("difusão: L = BᵀB = D − A", "L = D - A ? True" in s)
vl, bv = re.search(r"v'Lv = ([-0-9.]+)\s+\|Bv\|\^2 = ([-0-9.]+)", s).groups()
check("difusão: v'Lv = |Bv|² e é positivo", vl == bv and float(vl) > 0, f"{vl} {bv}")
check("difusão: λ₂ ≈ 0,4685 e 1/(cλ₂) ≈ 40,3", "λ₂ = 0.4685" in s and "= 40.3" in s)
somas = [float(x) for x in re.findall(r"soma = ([0-9.]+)", s)]
maiores = [float(x) for x in re.findall(r"maior = ([0-9.]+)", s)]
menores = [float(x) for x in re.findall(r"menor = ([-0-9.]+)", s)]
check("difusão: soma sempre 1", all(abs(x - 1) < 1e-4 for x in somas), str(somas))
check("difusão: o maior valor só desce, ninguém fica negativo", all(a >= b for a, b in zip(maiores, maiores[1:])) and min(menores) >= 0, str(maiores))
s, _ = rodar("difusao_lacunas.py")
check("difusão (lacunas): roda e avisa que ainda falta completar", "L = D - A ? False" in s)

# gargalo: dois grupos com porta eps
s, _ = rodar("gargalo_solucao.py")
linhas = re.findall(r"^\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)$", s, re.M)
rel = [float(b) / float(c) for _, b, c in linhas]
check("gargalo: λ₂ ≤ 2ε/k sempre, e λ₂ ≈ 2ε/k para ε pequeno", all(r <= 1 + 1e-3 for r in rel) and rel[0] > 0.99, str([round(r, 3) for r in rel[:3]]))
check("gargalo: o sinal de q₂ separa os grupos", "------++++++" in s or "++++++------" in s)
check("gargalo: 1/(cλ₂) ≈ 341 passos com ε = 0,05", "= 341" in s)
s, _ = rodar("gargalo_lacunas.py")
check("gargalo (lacunas): roda sem completar", "inf" in s)

print("\nfalhas:", fails)
sys.exit(1 if fails else 0)
