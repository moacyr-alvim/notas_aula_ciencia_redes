import numpy as np
import matplotlib.pyplot as plt

# Uma rede equilibrada "plantada", estragada aos poucos:
# 16 vértices em dois grupos, links sorteados com probabilidade 0,4, sinal + dentro dos grupos e - entre eles.
# Depois, cada link tem o sinal trocado com probabilidade eps (o "ruído"). Quanto a rede fica frustrada?
n = 16
rng = np.random.default_rng(5)

def rede(eps):
    grupo = rng.choice([-1, 1], n)
    links = []
    for i in range(n):
        for j in range(i + 1, n):
            if rng.random() < 0.4:
                s = grupo[i] * grupo[j]               # equilibrada: + dentro, - entre
                if rng.random() < eps:
                    s = -s                            # ruído
                links.append((i, j, s))
    return links

def laplaciano_sinais(links):
    L = np.zeros((n, n))
    for i, j, s in links:
        L[i, i] += 1
        L[j, j] += 1
        L[i, j] -= s
        L[j, i] -= s
    return L

def contrariados(links, cor):
    return sum(cor[i] * cor[j] != s for i, j, s in links)

def busca_local(links, cor):
    cor = cor.copy()
    melhorou = True
    while melhorou:
        melhorou = False
        for v in range(n):
            antes = contrariados(links, cor)
            cor[v] = -cor[v]
            if contrariados(links, cor) < antes:
                melhorou = True                       # ficou melhor: mantém a troca
            else:
                cor[v] = -cor[v]                      # não ficou: desfaz
    return cor

# todas as 2^15 pinturas (o vértice 0 fica fixo), para achar f exatamente
todas = np.array([[1] + [1 - 2 * ((m >> k) & 1) for k in range(n - 1)] for m in range(2 ** (n - 1))])
def frustracao(links):
    I = np.array([i for i, _, _ in links]); J = np.array([j for _, j, _ in links]); s = np.array([x for _, _, x in links])
    return int((todas[:, I] * todas[:, J] != s).sum(axis=1).min())

epsilons = np.linspace(0, 0.4, 9)
med = {"f": [], "cota": [], "q1": [], "q1+local": []}
for eps in epsilons:
    linhas = []
    for _ in range(8):
        links = rede(eps)
        m = len(links)
        lam, Q = np.linalg.eigh(laplaciano_sinais(links))
        cor_q1 = np.where(Q[:, 0] >= 0, 1, -1)
        linhas.append([frustracao(links) / m, max(0.0, n * lam[0] / 4 / m),
                       contrariados(links, cor_q1) / m, contrariados(links, busca_local(links, cor_q1)) / m])
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
plt.plot(epsilons, epsilons, color="0.7", lw=1, label="fração de links estragados")
plt.xlabel("ruído ε (probabilidade de trocar o sinal de um link)")
plt.ylabel("fração de links contrariados")
plt.legend(fontsize=8); plt.title("Frustração de uma rede equilibrada com ruído")
plt.tight_layout()
plt.show()
