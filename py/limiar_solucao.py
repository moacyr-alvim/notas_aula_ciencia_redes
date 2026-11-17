import numpy as np
import matplotlib.pyplot as plt
import networkx as nx

# --- A distribuição dos graus: lei de potência p_k ∝ k^(-2,5), de k = 3 a k = 300
ks = np.arange(301)
p = np.where(ks >= 3, np.maximum(ks, 1.0) ** -2.5, 0.0)
p /= p.sum()
k1, k2 = (ks * p).sum(), (ks ** 2 * p).sum()
beta, mu = 0.02, 0.2
print(f"<k> = {k1:.2f}   <k²>/<k> = {k2 / k1:.2f}")
print(f"R0 sem olhar os graus  β<k>/μ        = {beta * k1 / mu:.3f}")
R0 = beta * k2 / (k1 * mu)
print(f"R0 com os graus        β<k²>/(μ<k>)  = {R0:.3f}")

# --- O SIS por classe de grau, em equações de diferenças
def theta(i):
    # chance de que o vizinho na ponta de um link esteja infectado: média de i_k com peso k p_k/<k>
    return (ks * p * i).sum() / k1

def passo(i):
    th = theta(i)
    return (1 - mu) * i + (1 - i) * (1 - (1 - beta * th) ** ks)

i = np.full(ks.shape, 1e-4)
thetas, totais, perfis = [theta(i)], [(p * i).sum()], {}
for t in range(1, 201):
    i = passo(i)
    thetas.append(theta(i)); totais.append((p * i).sum())
    if t in (10, 200):
        perfis[t] = i.copy()

print(f"\nrazão de Θ no começo (passos 5 → 6) = {thetas[6] / thetas[5]:.4f}")
print(f"previsão 1 − μ + β<k²>/<k>          = {1 - mu + beta * k2 / k1:.4f}")
print(f"no passo 10: i_100/i_10 = {perfis[10][100] / perfis[10][10]:.2f}   (proporcional a k daria 10)")
print(f"equilíbrio: i = {totais[-1]:.3f}   i_3 = {i[3]:.3f}   i_30 = {i[30]:.3f}   i_300 = {i[300]:.3f}")

# --- Conferindo com pessoas numa rede fixa sorteada com esses graus (modelo de configuração)
rng = np.random.default_rng(1)
n = 4000
graus = rng.choice(ks, size=n, p=p)
if graus.sum() % 2:
    graus[0] += 1
G = nx.Graph(nx.configuration_model(graus.tolist(), seed=2))
G.remove_edges_from(nx.selfloop_edges(G))
viz = [np.array(list(G[v]), dtype=int) for v in range(n)]

infect = rng.random(n) < 0.01
sim = [infect.mean()]
for t in range(200):
    n_inf = np.array([infect[v].sum() for v in viz])            # vizinhos infectados de cada um
    pega = rng.random(n) < 1 - (1 - beta) ** n_inf               # cada vizinho infectado transmite com prob. β
    cura = rng.random(n) < mu
    infect = np.where(infect, ~cura, pega)
    sim.append(infect.mean())
print(f"\nsimulação numa rede fixa com n = {n}: infectados nos últimos 50 passos = {np.mean(sim[-50:]):.3f}")

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 3.6))
ax1.semilogy(totais, label="SIS por classe de grau")
ax1.semilogy(sim, alpha=.7, label="simulação na rede fixa")
ax1.set_xlabel("passo t"); ax1.set_ylabel("fração infectada"); ax1.legend()
ax1.set_title(f"β<k>/μ = {beta * k1 / mu:.2f} < 1, mas R0 = {R0:.2f}")
sel = p > 0
ax2.semilogx(ks[sel], perfis[200][sel], ".", label="equilíbrio")
ax2.semilogx(ks[sel], perfis[10][sel] / perfis[10][300], ".", label="passo 10, dividido por i_300")
ax2.semilogx(ks[sel], ks[sel] / 300, "k:", lw=1, label="k/300")
ax2.set_xlabel("grau k"); ax2.set_ylabel("i_k"); ax2.legend(); ax2.set_ylim(0, 1)
plt.tight_layout()
plt.show()
