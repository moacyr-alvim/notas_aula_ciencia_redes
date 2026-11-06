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

# comunidades pelo vetor de Fiedler
s, _ = rodar("fiedler_solucao.py")
check("fiedler: sinal dá lados 19/15, corte 10, erra 2 e 8", "lados 19 e 15   corte = 10   erram: [2, 8]" in s)
check("fiedler: mediana reproduz as facções (corte 11, sem erros)", "mediana: lados 17 e 17   corte = 11   erram: []" in s)
check("fiedler: cota nλ₂/4 = 3,98", "= 3.98 laços" in s)
ac = [float(x) for x in re.findall(r"^\s*[0-9.]+\s+([01]\.[0-9]+)$", s, re.M)]
check("fiedler: acertos caem de ~1 para ~0,5 com p_out", ac[0] > 0.97 and ac[-1] < 0.65, str(ac))
s, _ = rodar("fiedler_lacunas.py")
check("fiedler (lacunas): roda sem completar", "corte =  0" in s)

# redes com sinais: Gahuku-Gama
s, _ = rodar("sinais_solucao.py")
check("sinais: 29 positivos e 29 negativos", "16 tribos, 29 laços positivos e 29 negativos" in s)
check("sinais: 11 conflitos com a pintura da árvore, não equilibrada", "contrariam a pintura: 11" in s and "equilibrada? False" in s)
check("sinais: 68 triângulos, 9 desequilibrados (7 com ---)", "68 triângulos, 9 desequilibrados" in s and s.count("(---)") == 7)
check("sinais: a melhor divisão em dois contraria 7 laços e separa GAVEV, KOTUN, NAGAD, GAMA", "duas cores: 7" in s and "grupo 1: ['GAVEV', 'KOTUN', 'NAGAD', 'GAMA']" in s)
# os dados embutidos na célula são os de dados/gama.txt
import numpy as _np
emb = _np.loadtxt(io.StringIO(re.search(r'dados = """(.*?)"""', (root / "py" / "sinais_solucao.py").read_text(encoding="utf-8"), re.S).group(1)), dtype=int)
check("sinais: dados da célula = dados/gama.txt", (emb == _np.loadtxt(root / "dados" / "gama.txt", dtype=int)).all())
s, _ = rodar("sinais_lacunas.py")
check("sinais (lacunas): roda sem completar", "contrariam a pintura: 1" in s)

# laplaciano com sinais
s, _ = rodar("lapsinal_solucao.py")
check("lapsinal: L = D̄ − A_σ, λ₁ = 1,0403", "L = D̄ - A_σ ? True" in s and "λ₁ = 1.0403" in s)
check("lapsinal: f = 7 ≥ nλ₁/4 = 4,16; sinal de q₁ contraria 8", "f = 7;  cota n λ₁ / 4 = 4.16" in s and "contraria 8 laços" in s)
pol = re.search(r"prevista: ±([0-9.]+);  depois de 200 passos: \[([^\]]*)\]", s)
vals = [abs(float(x)) for x in pol.group(2).split()]
check("lapsinal: versão equilibrada polariza em ± (sᵀu₀)/n", all(abs(v - float(pol.group(1))) < 1e-4 for v in vals), pol.group(1))
s, _ = rodar("lapsinal_lacunas.py")
check("lapsinal (lacunas): roda sem completar", "L = D̄ - A_σ ? False" in s)

# frustração espectral: ruído sobre rede equilibrada
s, _ = rodar("frust_solucao.py")
lin = [list(map(float, l.split())) for l in re.findall(r"^[0-9]\.[0-9]{2}\s+[-0-9. ]+$", s, re.M)]
check("frust: 9 valores de ε", len(lin) == 9, str(len(lin)))
check("frust: ε = 0 dá f = 0 e cota 0", lin[0][1] == 0 and lin[0][2] == 0)
check("frust: cota ≤ f ≤ q1+local ≤ q1 em todos os ε", all(r[2] <= r[1] + 1e-9 and r[1] <= r[4] + 1e-9 and r[4] <= r[3] + 1e-9 for r in lin))
check("frust: f cresce com o ruído e fica abaixo de 1/2", lin[-1][1] > lin[1][1] and max(r[1] for r in lin) < 0.5)
s, _ = rodar("frust_lacunas.py")
check("frust (lacunas): roda sem completar", "eps    f/m" in s)

print("\nfalhas:", fails)
sys.exit(1 if fails else 0)
