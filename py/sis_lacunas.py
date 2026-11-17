import numpy as np
import matplotlib.pyplot as plt

beta, k, mu = 0.05, 8, 0.2        # transmissão por contato por passo, contatos por passo, recuperação por passo
n, T, i0 = 2000, 100, 20           # pessoas, passos, infectados no início

R0 = beta * k / mu
r = 1.0   ########### complete: a razão da progressão geométrica no começo ##########
print(f"R0 = beta <k> / mu = {R0:.2f}")
print(f"razão da progressão geométrica no começo: r = 1 - mu + beta <k> = {r:.3f}")
print(f"equilíbrio previsto: 1 - 1/R0 = {1 - 1 / R0:.3f}")

# --- 1. A equação de diferenças clássica
def passo_classico(i):
    return i   ########### complete: i + (novos infectados) - (recuperados), como no texto ##########

i_eq = [i0 / n]
for t in range(T):
    i_eq.append(passo_classico(i_eq[-1]))
i_eq = np.array(i_eq)

# --- 2. Simulação de pessoas: "mistura" (k contatos novos sorteados a cada passo)
#        e uma rede aleatória fixa (Erdős–Rényi com grau médio k)
rng = np.random.default_rng(0)

def simula(rede):
    if rede == "fixa":
        A = np.triu(rng.random((n, n)) < k / (n - 1), 1)
        A = (A | A.T).astype(float)
    infect = np.zeros(n, bool)
    infect[rng.choice(n, i0, replace=False)] = True
    frac = [infect.mean()]
    for t in range(T):
        if rede == "mistura":
            # quantos dos k contatos sorteados estão infectados: binomial(k, fração atual)
            m = rng.binomial(k, infect.mean(), size=n)
        else:
            m = A @ infect                          # quantos vizinhos infectados cada um tem
        pega = rng.random(n) < 1 - (1 - beta) ** m  # algum contato infectado transmitiu
        cura = rng.random(n) < mu
        infect = np.where(infect, ~cura, pega)
        frac.append(infect.mean())
    return np.array(frac)

curvas = {rede: np.mean([simula(rede) for _ in range(10)], axis=0) for rede in ("mistura", "fixa")}

def razao_inicial(f, teto=0.03):
    t1 = np.argmax(f > teto) - 1                    # último passo abaixo do teto
    return (f[t1] / f[0]) ** (1 / t1)

for rede, f in curvas.items():
    print(f"{rede:>8}: razão no começo = {razao_inicial(f):.3f}   equilíbrio (últimos 20 passos) = {f[-20:].mean():.3f}")

# --- 3. De volta: R0 a partir do tempo de duplicação
if r > 1:
    dup = np.log(2) / np.log(r)
    print(f"tempo de duplicação no começo: {dup:.2f} passos;  R0 = 1 + (2^(1/dup) - 1)/mu = {1 + (2 ** (1 / dup) - 1) / mu:.2f}")

ts = np.arange(T + 1)
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 3.6))
for rede, f in curvas.items():
    ax1.plot(ts, f, lw=2, label=f"simulação: {rede}")
ax1.plot(ts, i_eq, "k--", lw=1.5, label="equação de diferenças")
ax1.axhline(1 - 1 / R0, color="0.5", ls=":")
ax1.set_xlabel("passo t"); ax1.set_ylabel("fração de infectados"); ax1.legend(fontsize=8)

for rede, f in curvas.items():
    ax2.semilogy(ts, f, lw=2, label=f"simulação: {rede}")
ax2.semilogy(ts, i_eq, "k--", lw=1.5, label="equação de diferenças")
ax2.semilogy(ts[:30], i0 / n * r ** ts[:30], color="C3", ls=":", lw=1.5, label="progressão geométrica i₀ rᵗ")
ax2.set_ylim(1e-3, 1); ax2.set_xlabel("passo t"); ax2.legend(fontsize=8)
ax2.set_title("No começo: uma reta na escala log")
plt.tight_layout()
plt.show()
