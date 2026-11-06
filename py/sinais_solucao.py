import numpy as np
import matplotlib.pyplot as plt
import networkx as nx
from collections import deque
from io import StringIO

# Tribos Gahuku-Gama (Read, 1954). As duas matrizes 16 x 16 vêm empilhadas:
# primeiro a de alianças (positiva), depois a de hostilidades (negativa).
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
pos_, neg_ = M[:16], M[16:]
S = pos_ - neg_                     # S[i, j] = +1, -1 ou 0
n = len(nomes)
links = [(i, j, S[i, j]) for i in range(n) for j in range(i + 1, n) if S[i, j] != 0]
print(f"{n} tribos, {sum(s > 0 for _, _, s in links)} links positivos e {sum(s < 0 for _, _, s in links)} negativos")

# --- 1. A pintura da prova: busca em largura a partir de uma raiz
vizinhos = {i: [] for i in range(n)}
for i, j, s in links:
    vizinhos[i].append((j, s))
    vizinhos[j].append((i, s))

cor = {0: +1}                       # a raiz (GAVEV) recebe a cor +1
fila = deque([0])
while fila:
    u = fila.popleft()
    for v, s in vizinhos[u]:
        if v not in cor:
            cor[v] = cor[u] * s     # link positivo mantém a cor, negativo troca
            fila.append(v)

conflitos = [(nomes[i], nomes[j]) for i, j, s in links if cor[i] * cor[j] != s]
print("links que contrariam a pintura:", len(conflitos))
print("equilibrada?", len(conflitos) == 0)

# --- 2. Os triângulos
tri = [(a, b, c) for a in range(n) for b in range(a + 1, n) for c in range(b + 1, n)
       if S[a, b] and S[a, c] and S[b, c]]
desequ = [t for t in tri if S[t[0], t[1]] * S[t[0], t[2]] * S[t[1], t[2]] < 0]
print(f"{len(tri)} triângulos, {len(desequ)} desequilibrados:")
for a, b, c in desequ:
    sinais = "".join("+" if x > 0 else "-" for x in (S[a, b], S[a, c], S[b, c]))
    print(f"   {nomes[a]}-{nomes[b]}-{nomes[c]}  ({sinais})")

# --- 3. A melhor pintura em duas cores: testar as 2^15 (a primeira tribo fica fixa)
I = np.array([i for i, _, _ in links]); J = np.array([j for _, j, _ in links]); s = np.array([x for _, _, x in links])
todas = np.array([[1] + [1 - 2 * ((m >> k) & 1) for k in range(n - 1)] for m in range(2 ** (n - 1))])
contrariados = (todas[:, I] * todas[:, J] != s).sum(axis=1)
melhor = todas[contrariados.argmin()]
print("menor número de links contrariados com duas cores:", contrariados.min())
print("  grupo 1:", [nomes[i] for i in range(n) if melhor[i] > 0])
print("  grupo 2:", [nomes[i] for i in range(n) if melhor[i] < 0])

# --- desenho
G = nx.Graph()
G.add_nodes_from(range(n))
G.add_edges_from([(i, j) for i, j, _ in links])
# posições fixas (as mesmas da demo), para o desenho não depender de sorteio nem do scipy
xy = dict(enumerate(np.array([[0.806, 0.528], [0.704, 0.43], [0.501, 0.724], [0.466, 0.9], [0.401, 0.338], [0.416, 0.622],
                              [0.335, 0.518], [0.32, 0.749], [0.183, 0.23], [0.269, 0.1], [0.189, 0.578], [0.269, 0.647],
                              [0.299, 0.304], [0.454, 0.168], [0.697, 0.285], [0.817, 0.362]]) * [1, -1]))
plt.figure(figsize=(7, 5.5))
nx.draw_networkx_edges(G, xy, edgelist=[(i, j) for i, j, x in links if x > 0], edge_color="C0", width=1.5)
nx.draw_networkx_edges(G, xy, edgelist=[(i, j) for i, j, x in links if x < 0], edge_color="C3", style="dashed", width=1)
nx.draw_networkx_nodes(G, xy, node_color=["#2a9d8f" if melhor[i] > 0 else "#c9a227" for i in range(n)], node_size=260)
nx.draw_networkx_labels(G, xy, labels={i: nomes[i] for i in range(n)}, font_size=7)
plt.title("Gahuku-Gama: + azul, − vermelho tracejado; cores = melhor divisão em dois")
plt.axis("off")
plt.show()
