import numpy as np
import matplotlib.pyplot as plt
import networkx as nx

rng = np.random.default_rng(0)

# --- 1. O paradoxo da amizade no clube de caratê (uma rede real, não sorteada)
G = nx.karate_club_graph()
graus = np.array([d for _, d in G.degree()])
k1, k2 = graus.mean(), (graus ** 2).mean()
grau_dos_vizinhos = np.mean([G.degree(v) for u in G for v in G[u]])   # sorteia um link e olha a ponta
print(f"caratê: grau médio de um membro = {k1:.2f}")
print(f"        grau médio de quem está na ponta de um link = {grau_dos_vizinhos:.2f}   (<k²>/<k> = {k2 / k1:.2f})")

# --- 2. Molloy–Reed: redes do modelo de configuração com graus de Poisson
def rede_de_configuracao(graus):
    if graus.sum() % 2:
        graus[0] += 1                                # a soma dos graus precisa ser par
    M = nx.configuration_model(graus.tolist(), seed=int(rng.integers(1 << 30)))
    G = nx.Graph(M)                                  # descarta links repetidos
    G.remove_edges_from(nx.selfloop_edges(G))        # e laços de um vértice nele mesmo
    return G

def maior_pedaco(G):
    return max(len(c) for c in nx.connected_components(G)) / G.number_of_nodes()

n = 3000
ks = np.linspace(0.2, 3.0, 15)
gigante = []
for c in ks:
    graus = rng.poisson(c, n)
    gigante.append(maior_pedaco(rede_de_configuracao(graus)))
    # Molloy–Reed para Poisson: <k²>/<k> = (c² + c)/c = c + 1 > 2  ⇔  c > 1
print("graus de Poisson:  <k>   maior pedaço")
for c, g in zip(ks[::2], gigante[::2]):
    print(f"                  {c:4.2f}   {g:.3f}")

# --- 3. Mistura de graus 1 e 3: Σ k(k-2) p_k = -a + 3(1-a) > 0  ⇔  a < 3/4
as_ = np.linspace(0, 1, 15)
gig_mist = []
for a in as_:
    graus = np.where(rng.random(n) < a, 1, 3)
    gig_mist.append(maior_pedaco(rede_de_configuracao(graus)))

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 3.6))
ax1.plot(ks, gigante, "o-"); ax1.axvline(1, color="k", ls="--", lw=1)
ax1.set_xlabel("<k> (graus de Poisson)"); ax1.set_ylabel("maior pedaço / n"); ax1.set_title("Limiar em <k> = 1")
ax2.plot(as_, gig_mist, "o-"); ax2.axvline(0.75, color="k", ls="--", lw=1)
ax2.set_xlabel("fração a de vértices de grau 1 (o resto tem grau 3)"); ax2.set_title("Limiar em a = 3/4")
plt.tight_layout()
plt.show()
