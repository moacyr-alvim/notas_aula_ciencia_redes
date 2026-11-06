import numpy as np
import matplotlib.pyplot as plt

# Uma rede equilibrada "plantada", estragada aos poucos:
# 16 vértices em dois grupos, laços sorteados com probabilidade 0,4, sinal + dentro dos grupos e - entre eles.
# Depois, cada laço tem o sinal trocado com probabilidade eps (o "ruído"). Quanto a rede fica frustrada?
n = 16
rng = np.random.default_rng(5)

def rede(eps):
    grupo = rng.choice([-1, 1], n)
    lacos = []
    for i in range(n):
        for j in range(i + 1, n):
            if rng.random() < 0.4:
                s = grupo[i] * grupo[j]               # equilibrada: + dentro, - entre
                if rng.random() < eps:
                    s = -s                            # ruído
                lacos.append((i, j, s))
    return lacos

def laplaciano_sinais(lacos):
    L = np.zeros((n, n))
    for i, j, s in lacos:
        L[i, i] += 1
        L[j, j] += 1
        L[i, j] -= s
        L[j, i] -= s
    return L

def contrariados(lacos, cor):
    return sum(cor[i] * cor[j] != s for i, j, s in lacos)

def busca_local(lacos, cor):
    cor = cor.copy()
    melhorou = True
    while melhorou:
        melhorou = False
        for v in range(n):
            antes = contrariados(lacos, cor)
            cor[v] = -cor[v]
            if contrariados(lacos, cor) < antes:
                melhorou = True                       # ficou melhor: mantém a troca
            else:
                cor[v] = -cor[v]                      # não ficou: desfaz
    return cor

# todas as 2^15 pinturas (o vértice 0 fica fixo), para achar f exatamente
todas = np.array([[1] + [1 - 2 * ((m >> k) & 1) for k in range(n - 1)] for m in range(2 ** (n - 1))])
def frustracao(lacos):
    I = np.array([i for i, _, _ in lacos]); J = np.array([j for _, j, _ in lacos]); s = np.array([x for _, _, x in lacos])
    return int((todas[:, I] * todas[:, J] != s).sum(axis=1).min())

epsilons = np.linspace(0, 0.4, 9)
med = {"f": [], "cota": [], "q1": [], "q1+local": []}
for eps in epsilons:
    linhas = []
    for _ in range(8):
        lacos = rede(eps)
        m = len(lacos)
        lam, Q = np.linalg.eigh(laplaciano_sinais(lacos))
        cor_q1 = np.where(Q[:, 0] >= 0, 1, -1)
        linhas.append([frustracao(lacos) / m, max(0.0, n * lam[0] / 4 / m),
                       contrariados(lacos, cor_q1) / m, contrariados(lacos, busca_local(lacos, cor_q1)) / m])
    for chave, v in zip(med, np.mean(linhas, axis=0)):
        med[chave].append(v)

print(" eps    f/m   cota/m   q1/m   q1+local/m")
for k, eps in enumerate(epsilons):
    print(f"{eps:4.2f}  {med['f'][k]:.3f}  {med['cota'][k]:.3f}   {med['q1'][k]:.3f}   {med['q1+local'][k]:.3f}")

plt.figure(figsize=(7, 4))
plt.plot(epsilons, med["f"], "ko-", lw=2, label="f / m (exato)")
plt.plot(epsilons, med["q1"], "s--", label="sinal de q₁")
plt.plot(epsilons, med["q1+local"], "^--", label="sinal de q₁ + busca local")
plt.plot(epsilons, med["cota"], "v:", label="cota espectral n λ₁ / 4m")
plt.plot(epsilons, epsilons, color="0.7", lw=1, label="fração de laços estragados")
plt.xlabel("ruído ε (probabilidade de trocar o sinal de um laço)")
plt.ylabel("fração de laços contrariados")
plt.legend(fontsize=8); plt.title("Frustração de uma rede equilibrada com ruído")
plt.tight_layout()
plt.show()
