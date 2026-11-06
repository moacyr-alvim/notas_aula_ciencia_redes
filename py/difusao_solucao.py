import numpy as np
import matplotlib.pyplot as plt
import networkx as nx

# O clube de caratê de Zachary: 34 membros, um laço para cada par que se encontrava fora das aulas.
G = nx.karate_club_graph()
n = G.number_of_nodes()
c = 1.0

# Cuidado: no networkx o grafo vem com pesos (o número de contextos em que o par se encontrava).
# Aqui queremos só "ligado ou não": weight=None.
A = nx.to_numpy_array(G, weight=None)

# --- Laplaciano: L = D - A, com D a matriz diagonal dos graus
graus = A.sum(axis=1)
D = np.diag(graus)
L = D - A

# confira: os graus batem com os do networkx, e cada linha de L soma zero
print("graus conferem com o networkx?", np.allclose(graus, [d for _, d in G.degree()]))
print("linhas de L somam zero?", np.allclose(L.sum(axis=1), 0) and L.any())

# --- Dado inicial: toda a quantidade no vértice 0 (o instrutor)
u0 = np.zeros(n)
u0[0] = 1.0

# --- Solução modo a modo:  L = Q diag(lam) Q'
lam, Q = np.linalg.eigh(L)
a = Q.T @ u0                      # coeficientes de u0 na base dos autovetores

def u_em(t):
    # u(t) = soma_k exp(-c lam_k t) a_k q_k
    return Q @ (np.exp(-c * lam * t) * a)

print("os 4 menores autovalores:", np.round(lam[:4], 4) + 0.0)
lam2 = lam[1]
for t in (0, 0.5, 2, 10):
    u = u_em(t)
    print(f"t = {t:>4}: soma = {u.sum():.4f}   maior = {u.max():.4f}   menor = {np.round(u.min(), 4) + 0.0:.4f}")

ts = np.linspace(0, 10, 300)
U = np.array([u_em(t) for t in ts])
media = u0.sum() / n

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 3.6))
ax1.plot(ts, U[:, 1:], color="0.6", lw=0.8)
ax1.plot(ts, U[:, 0], color="C3", lw=2.5, label="vértice 0")
ax1.axhline(media, color="k", ls=":", lw=1, label="média 1/n")
ax1.set_xlabel("t"); ax1.set_ylabel("u_i(t)"); ax1.set_ylim(0, 0.35); ax1.legend()
ax1.set_title("u_i(t) (eixo cortado em 0,35)")

dist = np.abs(U - media).max(axis=1)
ax2.semilogy(ts, dist, lw=2, label="max_i |u_i - média|")
ax2.semilogy(ts, dist[-1] * np.exp(-c * lam2 * (ts - ts[-1])), "k--", lw=1, label="inclinação de exp(-λ₂ t)")
ax2.set_xlabel("t"); ax2.legend(); ax2.set_title("Distância ao equilíbrio")
plt.tight_layout()
plt.show()
