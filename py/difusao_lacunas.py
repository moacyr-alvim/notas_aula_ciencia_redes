import numpy as np
import matplotlib.pyplot as plt
import networkx as nx

# O clube de caratê de Zachary: 34 membros, um laço para cada par que se encontrava fora das aulas.
G = nx.karate_club_graph()
n = G.number_of_nodes()
lacos = list(G.edges())        # cada laço (i, j), orientado de i para j (a orientação é arbitrária)
m = len(lacos)

# --- Matriz de incidência B (m x n): a linha do laço i -> j tem -1 na coluna i e +1 na coluna j
B = np.zeros((m, n))
for e, (i, j) in enumerate(lacos):
    ########### complete: -1 na coluna i e +1 na coluna j da linha e ##########
    pass

# --- Laplaciano
L = np.zeros((n, n))   ########### complete: L = B' B (em numpy, B.T @ B) ##########

# confira: L = D - A, e u'Lu = |Bu|^2 >= 0
A = nx.to_numpy_array(G, weight=None)      # weight=None: só "ligado ou não" (o networkx guarda pesos)
graus = A.sum(axis=1)
print("L = D - A ?", np.allclose(L, np.diag(graus) - A) and L.any())
rng = np.random.default_rng(0)
v = rng.normal(size=n)
print(f"para um v ao acaso: v'Lv = {v @ L @ v:.4f}   |Bv|^2 = {np.sum((B @ v)**2):.4f}")

# --- O passo de tempo: método de Euler com Δt = 1
dmax = graus.max()
c = 0.9 / dmax                # c <= 1/d_max: ninguém fica negativo
K = 150                       # número de passos

u = np.zeros(n)
u[0] = 1.0                    # toda a quantidade no vértice 0 (o instrutor)
historia = [u.copy()]
for k in range(K):
    ########### complete: um passo de Euler, u <- u - c L u ##########
    pass
    historia.append(u.copy())
U = np.array(historia)        # U[k, i] = u_i no passo k

for k in (0, 1, 10, 50, 150):
    print(f"passo {k:>3}: soma = {U[k].sum():.4f}   maior = {U[k].max():.4f}   menor = {np.round(U[k].min(), 4) + 0.0:.4f}")

lam = np.linalg.eigvalsh(L)
lam2 = lam[1]
print(f"λ₂ = {lam2:.4f};  passos até o equilíbrio ~ 1/(c λ₂) = {(1 / (c * lam2) if lam2 > 1e-12 else float('inf')):.1f}")

ks = np.arange(K + 1)
media = 1 / n
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 3.6))
ax1.plot(ks, U[:, 1:], color="0.6", lw=0.8)
ax1.plot(ks, U[:, 0], color="C3", lw=2.5, label="vértice 0")
ax1.axhline(media, color="k", ls=":", lw=1, label="média 1/n")
ax1.set_xlabel("passo k"); ax1.set_ylabel("u_i"); ax1.set_ylim(0, 0.35); ax1.legend()
ax1.set_title("u_i a cada passo (eixo cortado em 0,35)")

dist = np.abs(U - media).max(axis=1)
ax2.semilogy(ks, dist, lw=2, label="max_i |u_i - média|")
ax2.semilogy(ks, dist[-1] * (1 - c * lam2) ** (ks - K), "k--", lw=1, label="inclinação de (1 - cλ₂)^k")
ax2.set_xlabel("passo k"); ax2.legend(); ax2.set_title("Distância ao equilíbrio")
plt.tight_layout()
plt.show()
