import numpy as np
import matplotlib.pyplot as plt

# Dois grupos de k vértices, todos ligados a todos dentro de cada grupo (peso 1),
# e uma única "porta" entre eles: o laço (k-1, k), com peso eps.
k = 6
n = 2 * k

def dois_grupos(eps):
    lacos, pesos = [], []
    for g in range(2):
        for i in range(k):
            for j in range(i + 1, k):
                lacos.append((g * k + i, g * k + j))
                pesos.append(1.0)
    lacos.append((k - 1, k))      # a porta
    pesos.append(eps)
    return lacos, np.array(pesos)

def laplaciano(lacos, pesos):
    B = np.zeros((len(lacos), n))
    for e, (i, j) in enumerate(lacos):
        ########### complete: -1 na coluna i e +1 na coluna j ##########
        pass
    C = np.diag(pesos)            # o peso de cada laço
    return np.zeros((n, n))       ########### complete: com pesos, L = B' C B ##########

# --- 1. λ₂ contra o peso da porta
print("   eps       λ₂      2 eps / k")
eps_lista = np.logspace(-3, 0, 13)
lam2 = []
for eps in eps_lista:
    L = laplaciano(*dois_grupos(eps))
    lam = np.linalg.eigvalsh(L)   # em ordem crescente
    lam2.append(lam[1])
    print(f"{eps:8.4f}  {lam[1]:9.5f}  {2 * eps / k:9.5f}")
lam2 = np.array(lam2)

# --- 2. o vetor de Fiedler separa os grupos sem que ninguém diga quais são
eps = 0.05
L = laplaciano(*dois_grupos(eps))
lam, Q = np.linalg.eigh(L)
q2 = Q[:, 1]
print("sinal de q2 em cada vértice:", "".join("+" if x > 0 else "-" for x in q2))

# --- 3. a difusão em passos: dentro dos grupos depressa, entre os grupos devagar
dmax = (k - 1) + eps              # o maior grau (com pesos): os vértices da porta
c = 0.9 / dmax
K = 3000
u = np.zeros(n)
u[0] = 1.0
medias = []
for passo in range(K + 1):
    medias.append((u[:k].mean(), u[k:].mean(), u[:k].max() - u[:k].min()))
    ########### complete: um passo de Euler ##########
    pass
medias = np.array(medias)
T = 1 / (c * lam[1]) if lam[1] > 1e-12 else np.inf
print(f"passos até o equilíbrio ~ 1/(c λ₂) = {T:.0f}")

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 3.6))
ax1.loglog(eps_lista, lam2, "o-", label="λ₂")
ax1.loglog(eps_lista, 2 * eps_lista / k, "k--", lw=1, label="2ε/k")
ax1.set_xlabel("peso da porta ε"); ax1.legend(); ax1.set_title("λ₂ cai junto com a porta")

ks = np.arange(K + 1)
ax2.semilogx(ks + 1, medias[:, 0], lw=2, label="média do grupo A")
ax2.semilogx(ks + 1, medias[:, 1], lw=2, label="média do grupo B")
ax2.semilogx(ks + 1, medias[:, 2], "k:", lw=1.5, label="maior − menor dentro de A")
ax2.axhline(1 / n, color="0.5", lw=0.8)
if np.isfinite(T):
    ax2.axvline(T, color="0.5", ls="--", lw=0.8)
ax2.set_xlabel("passo k + 1 (escala log)"); ax2.legend(fontsize=8); ax2.set_title(f"Difusão com ε = {eps}")
plt.tight_layout()
plt.show()
