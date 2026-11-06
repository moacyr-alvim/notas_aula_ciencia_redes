import numpy as np
import matplotlib.pyplot as plt
import networkx as nx

def laplaciano(n, lacos):
    B = np.zeros((len(lacos), n))
    for e, (i, j) in enumerate(lacos):
        B[e, i], B[e, j] = -1, +1
    return B.T @ B

def corte(lacos, lado):
    # quantos laços ligam vértices de lados diferentes
    return sum(lado[i] != lado[j] for i, j in lacos)

def fiedler(L):
    lam, Q = np.linalg.eigh(L)        # autovalores em ordem crescente
    return lam[1], Q[:, 1]            # λ₂ e o seu autovetor q₂

# --- 1. O clube de caratê
G = nx.karate_club_graph()
n = G.number_of_nodes()
lacos = list(G.edges())
faccao = np.array([G.nodes[i]["club"] == "Officer" for i in G])   # o que de fato aconteceu

lam2, q2 = fiedler(laplaciano(n, lacos))
if q2 @ (2 * faccao - 1) < 0:         # o sinal de um autovetor é arbitrário: orienta como as facções
    q2 = -q2

pelo_sinal = q2 > 0
pela_mediana = q2 > np.median(q2)
for nome, lado in (("sinal", pelo_sinal), ("mediana", pela_mediana), ("facções reais", faccao)):
    erros = [i for i in range(n) if lado[i] != faccao[i]]
    print(f"{nome:>13}: lados {lado.sum():2d} e {n - lado.sum():2d}   corte = {corte(lacos, lado):2d}   erram: {erros}")
print(f"λ₂ = {lam2:.4f};  toda bisseção corta pelo menos n λ₂ / 4 = {n * lam2 / 4:.2f} laços")

# --- 2. Modelo estocástico de blocos: dois grupos de k, laço com prob. p_in dentro e p_out entre
rng = np.random.default_rng(1)
k, p_in = 50, 0.2

def blocos(p_out):
    grupo = np.repeat([False, True], k)
    P = np.where(grupo[:, None] == grupo[None, :], p_in, p_out)
    sorteio = np.triu(rng.random((2 * k, 2 * k)) < P, 1)
    return list(zip(*np.nonzero(sorteio))), grupo

p_outs = np.linspace(0.0, 0.2, 21)
media_acertos = []
for p_out in p_outs:
    ac = []
    for _ in range(20):
        lacos_b, grupo = blocos(p_out)
        lam2_b, q = fiedler(laplaciano(2 * k, lacos_b))
        lado = q > np.median(q)
        a = np.mean(lado == grupo)
        ac.append(max(a, 1 - a))      # os rótulos podem sair trocados
    media_acertos.append(np.mean(ac))
print("p_out   acertos")
for p, a in zip(p_outs[::4], media_acertos[::4]):
    print(f"{p:5.2f}   {a:.2f}")

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 3.6))
ordem = np.argsort(q2)
cores = np.where(faccao[ordem], "C0", "C3")
ax1.bar(range(n), q2[ordem], color=cores)
ax1.axhline(0, color="k", lw=0.8)
ax1.set_xticks(range(n)); ax1.set_xticklabels(ordem, fontsize=6)
ax1.set_title("q₂ do caratê, em ordem (cor = facção real)")

ax2.plot(p_outs / p_in, media_acertos, "o-")
ax2.axhline(0.5, color="0.5", lw=0.8)
ax2.set_xlabel("p_out / p_in"); ax2.set_ylabel("fração de acertos")
ax2.set_title(f"Modelo de blocos, 2 grupos de {k}")
plt.tight_layout()
plt.show()
