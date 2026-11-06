import numpy as np
import matplotlib.pyplot as plt
from io import StringIO

# Tribos Gahuku-Gama (Read, 1954): alianças (+1) e hostilidades (-1)
dados = """
0 1 0 0 0 0 0 0 0 0 0 0 0 0 1 1
1 0 0 0 0 0 0 0 0 0 0 0 0 0 1 1
0 0 0 1 0 1 1 1 0 0 0 0 0 0 0 0
0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0
0 0 0 0 0 0 1 0 1 0 0 0 0 1 0 0
0 0 1 0 0 0 1 1 0 0 1 1 0 0 0 0
0 0 1 0 1 1 0 1 0 0 1 1 1 0 0 0
0 0 1 1 0 1 1 0 0 0 1 1 0 0 0 0
0 0 0 0 1 0 0 0 0 1 0 0 1 0 0 0
0 0 0 0 0 0 0 0 1 0 0 0 1 0 0 0
0 0 0 0 0 1 1 1 0 0 0 1 0 0 0 0
0 0 0 0 0 1 1 1 0 0 1 0 0 0 0 0
0 0 0 0 0 0 1 0 1 1 0 0 0 1 0 0
0 0 0 0 1 0 0 0 0 0 0 0 1 0 0 0
1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 1
1 1 0 0 0 0 0 0 0 0 0 0 0 0 1 0
0 0 1 1 1 1 0 0 0 0 0 1 0 0 0 0
0 0 1 0 1 1 0 0 1 1 0 0 0 0 0 0
1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0
1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
1 1 0 0 0 0 0 0 0 0 0 0 0 0 1 1
1 1 0 0 0 0 0 0 1 0 0 0 1 0 0 1
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0
0 1 0 0 0 1 0 0 0 0 1 0 0 0 1 0
0 1 0 0 0 0 0 0 0 0 1 0 0 0 1 0
0 0 0 0 0 0 0 0 1 1 0 0 1 0 1 1
1 0 0 0 0 0 0 0 0 0 0 0 0 1 1 1
0 0 0 0 0 1 0 0 0 0 1 0 0 0 1 1
0 0 0 0 0 0 0 1 0 0 0 1 0 0 0 1
0 0 0 0 1 0 0 0 1 1 1 1 1 0 0 0
0 0 0 0 1 1 0 0 0 0 1 1 1 1 0 0
"""
nomes = "GAVEV KOTUN OVE ALIKA NAGAM GAHUK MASIL UKUDZ NOTOH KOHIK GEHAM ASARO UHETO SEUVE NAGAD GAMA".split()
M = np.loadtxt(StringIO(dados), dtype=int)
S = M[:16] - M[16:]
n = 16
links = [(i, j, S[i, j]) for i in range(n) for j in range(i + 1, n) if S[i, j] != 0]

# --- 1. Incidência com sinais e laplaciano
def laplaciano_sinais(links):
    B = np.zeros((len(links), n))
    for e, (i, j, s) in enumerate(links):
        if s > 0:
            B[e, i], B[e, j] = -1, +1     # positivo: (Bu)_e = u_j - u_i
        else:
            pass                          ########### complete: negativo, (Bu)_e = u_i + u_j ##########
    return B, B.T @ B

B, L = laplaciano_sinais(links)
A = np.zeros((n, n))
for i, j, s in links:
    A[i, j] = A[j, i] = s                 # adjacência com sinais
Dbar = np.diag(np.abs(A).sum(axis=1))     # quantos links cada tribo tem, sem olhar o sinal
print("L = D̄ - A_σ ?", np.allclose(L, Dbar - A) and L.any())

lam, Q = np.linalg.eigh(L)
lam1, q1 = lam[0], Q[:, 0]
print(f"λ₁ = {lam1:.4f}   (zero só se a rede fosse equilibrada)")

# --- 2. λ₁ e o índice de frustração
I = np.array([i for i, _, _ in links]); J = np.array([j for _, j, _ in links]); sig = np.array([s for _, _, s in links])
def contrariados(cor):
    return int((cor[I] * cor[J] != sig).sum())
todas = np.array([[1] + [1 - 2 * ((m >> k) & 1) for k in range(n - 1)] for m in range(2 ** (n - 1))])
por_pintura = (todas[:, I] * todas[:, J] != sig).sum(axis=1)
f = int(por_pintura.min())
melhor = todas[por_pintura.argmin()]
cor_q1 = np.where(q1 >= 0, 1, -1)
print(f"índice de frustração f = {f};  cota n λ₁ / 4 = {n * lam1 / 4:.2f}")
print(f"a divisão pelo sinal de q₁ contraria {contrariados(cor_q1)} links:",
      [nomes[i] for i in range(n) if cor_q1[i] == cor_q1[0]], "contra o resto")

# --- 3. Opiniões com antagonismo: u <- u - c L u
def evolui(L, u0, K):
    c = 0.9 / np.diag(L).max()
    U = [u0]
    for _ in range(K):
        U.append(U[-1])               ########### complete: um passo, u <- u - c L u ##########
    return np.array(U)

rng = np.random.default_rng(3)
u0 = rng.uniform(-1, 1, n)
U = evolui(L, u0, 200)

# a mesma rede, mas com os f links contrariados pela melhor pintura trocados de sinal: fica equilibrada
links_eq = [(i, j, s if melhor[i] * melhor[j] == s else -s) for i, j, s in links]
_, L_eq = laplaciano_sinais(links_eq)
print(f"versão equilibrada: λ₁ = {abs(np.linalg.eigvalsh(L_eq)[0]):.1e}  (zero, a menos do arredondamento)")
U_eq = evolui(L_eq, u0, 200)
previsto = (melhor @ u0) / n
print(f"polarização prevista: ±{abs(previsto):.4f};  depois de 200 passos: {np.round(U_eq[-1], 4)}")

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 3.6), sharey=True)
ax1.plot(U, lw=1); ax1.set_title(f"Gahuku-Gama (λ₁ = {lam1:.2f}): o conflito apaga as opiniões")
ax2.plot(U_eq, lw=1); ax2.axhline(previsto, color="k", ls=":"); ax2.axhline(-previsto, color="k", ls=":")
ax2.set_title(f"Trocando {f} sinais (λ₁ = 0): polarização")
for ax in (ax1, ax2):
    ax.set_xlabel("passo k")
ax1.set_ylabel("opiniões u_i")
plt.tight_layout()
plt.show()
