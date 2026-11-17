import numpy as np
import matplotlib.pyplot as plt

# --- A mesma lei de potência da demo: p_k ∝ k^(-2,5), de k = 3 a k = 300
ks = np.arange(301)
p = np.where(ks >= 3, np.maximum(ks, 1.0) ** -2.5, 0.0)
p /= p.sum()
q = ks * p / (ks * p).sum()            # grau de quem foi alcançado por um contato
kap = (ks * q).sum()                   # <k²>/<k>
mu = 0.2

def g(x, beta):
    # E[x^N | k] para cada k: N ~ Binomial(k D, β), com D geométrica de média 1/μ
    y = (1 - beta + beta * x) ** ks
    return mu * y / (1 - (1 - mu) * y)

def chance_de_surto(beta):
    u = 0.0                            # u_n = chance de a descendência morrer em até n gerações
    for _ in range(3000):
        u = (q * g(u, beta)).sum()
    return max(0.0, 1 - (p * g(u, beta)).sum()), u

# --- Simulando o processo de ramificação diretamente
rng = np.random.default_rng(0)
def simula(beta, rodadas=1500, teto=200):
    sobreviveu = 0
    for _ in range(rodadas):
        graus = rng.choice(ks, size=1, p=p)                     # o paciente zero é uma pessoa típica
        while 0 < len(graus) < teto:
            D = rng.geometric(mu, size=len(graus))              # duração de cada infecção
            filhos = rng.binomial(graus * D, beta)              # contágios de cada um
            graus = rng.choice(ks, size=filhos.sum(), p=q)      # os filhos chegaram por um contato
        sobreviveu += len(graus) >= teto
    return sobreviveu / rodadas

print(f"<k²>/<k> = {kap:.2f};  limiar: β > μ<k>/<k²> = {mu / kap:.4f}")
print("   β      R0    P(surto) fórmula   simulação")
betas = [0.005, 0.008, 0.01, 0.015, 0.02, 0.03]
for b in betas:
    P, u = chance_de_surto(b)
    print(f"{b:6.3f}  {b * kap / mu:5.2f}       {P:.3f}          {simula(b):.3f}")

P, u = chance_de_surto(0.02)
print("\nβ = 0,02: chance de surto conforme o grau do paciente zero")
for k in [3, 10, 30, 100, 300]:
    print(f"  k = {k:3d}:  {abs(1 - g(u, 0.02)[k]):.2f}")

bb = np.linspace(0.002, 0.04, 60)
fig, ax = plt.subplots(figsize=(6.5, 3.6))
ax.plot(bb, [chance_de_surto(b)[0] for b in bb], label="fórmula (ponto fixo de u)")
ax.plot(betas, [simula(b, 800) for b in betas], "o", label="simulação do processo")
ax.axvline(mu / kap, color="k", ls="--", lw=1, label="limiar")
ax.set_xlabel("β"); ax.set_ylabel("chance de surto a partir de 1 caso"); ax.legend()
plt.tight_layout()
plt.show()
