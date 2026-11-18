import numpy as np
import matplotlib.pyplot as plt
import networkx as nx

rng = np.random.default_rng(3)

def rede_lei_de_potencia(n, gama, kmin=3):
    kmax = int(kmin * n ** (1 / (gama - 1)))          # o maior grau cresce com n
    ks = np.arange(kmin, kmax + 1)
    p = ks ** -gama / (ks ** -gama).sum()
    graus = rng.choice(ks, size=n, p=p)
    if graus.sum() % 2:
        graus[0] += 1
    G = nx.Graph(nx.configuration_model(graus.tolist(), seed=int(rng.integers(1 << 30))))
    G.remove_edges_from(nx.selfloop_edges(G))
    return G

# --- 1. λ_max contra ⟨k²⟩/⟨k⟩ e √k_max, com γ = 3,5 (⟨k²⟩ finito)
print("    n   <k²>/<k>  √k_max  λ_max")
for n in [500, 1000, 2000]:
    G = rede_lei_de_potencia(n, 3.5)
    A = nx.to_numpy_array(G)
    k = A.sum(axis=1)
    autoval, autovet = np.linalg.eigh(A)               # autovalores em ordem crescente (A é simétrica)
    lam = autoval[-1]                                  # o maior
    print(f"{n:5d}   {(k ** 2).mean() / k.mean():6.2f}   {np.sqrt(k.max()):6.2f}  {lam:6.2f}")

# --- 2. O autovetor: onde ele se concentra?
v = np.abs(autovet[:, -1])
hub = int(np.argmax(k))
print(f"\nmaior grau: {int(k[hub])};  maior componente do autovetor no vértice de grau {int(k[np.argmax(v)])}")
print(f"o autovetor está espalhado por cerca de {1 / (v ** 4).sum():.0f} de {len(v)} vértices")

# --- 3. O SIS vértice a vértice: p_i' = (1 − μ) p_i + (1 − p_i)(1 − Π_j (1 − β A_ij p_j))
origem, destino = np.nonzero(A)                        # os links, nos dois sentidos

def equilibrio(beta, mu, passos=400):
    p = np.full(len(A), 0.5)
    for _ in range(passos):
        # chance de nenhum vizinho transmitir: o produto de (1 − β p_j), somando logaritmos link a link
        escapa = np.exp(np.bincount(origem, weights=np.log(1 - beta * p[destino]), minlength=len(A)))
        p = (1 - mu) * p + (1 - p) * (1 - escapa)
    return p.mean()

mu = 0.2
limiar = 1 / lam
print(f"\nlimiar na rede fixa: β/μ > 1/λ_max = {limiar:.4f};  pelas classes de grau: {k.mean() / (k ** 2).mean():.4f}")
razoes = limiar * np.array([0.5, 0.8, 0.95, 1.05, 1.25, 1.5, 2, 3])
prev = [equilibrio(r * mu, mu) for r in razoes]
for r, x in zip(razoes, prev):
    print(f"β/μ = {r:.4f}  ({r / limiar:4.2f} × limiar):  infectados no equilíbrio = {x:.5f}")

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 3.6))
ax1.loglog(k, v + 1e-12, ".", alpha=.4)
ax1.loglog(np.sort(k), np.sort(k) / np.linalg.norm(k), "k--", lw=1, label="v ∝ k (campo médio)")
ax1.set_ylim(1e-4, 1); ax1.set_xlabel("grau k_i"); ax1.set_ylabel("v_i"); ax1.legend()
ax2.semilogy(razoes, np.maximum(prev, 1e-8), "o-")
ax2.axvline(limiar, color="r", ls="--", lw=1, label="1/λ_max")
ax2.axvline(k.mean() / (k ** 2).mean(), color="b", ls="--", lw=1, label="<k>/<k²>")
ax2.set_xlabel("β/μ"); ax2.set_ylabel("infectados no equilíbrio"); ax2.legend()
plt.tight_layout()
plt.show()
