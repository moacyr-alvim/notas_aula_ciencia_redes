import numpy as np
import matplotlib.pyplot as plt

beta, k, mu = 0.05, 8, 0.2        # os mesmos parâmetros do exemplo do SIS
R0 = beta * k / mu
i0, T = 0.001, 120

# --- O SIR em equações de diferenças
s, i, r = [1 - i0], [i0], [0.0]
for t in range(T):
    novos = beta * k * s[-1] * i[-1]          # suscetíveis que se infectam
    curados = mu * i[-1]                        # infectados que se curam (e ficam imunes)
    s.append(s[-1])                             ########### complete: s perde os novos ##########
    i.append(i[-1])                             ########### complete: i ganha os novos e perde os curados ##########
    r.append(r[-1])                             ########### complete: r ganha os curados ##########
s, i, r = map(np.array, (s, i, r))

# --- O pico: i cresce enquanto beta <k> s > mu, isto é, enquanto s > 1/R0
tp = int(np.argmax(i))
print(f"R0 = {R0:.2f}")
print(f"pico no passo {tp}: {100 * i[tp]:.1f}% infectados ao mesmo tempo")
print(f"no pico, s = {s[tp]:.3f}  (1/R0 = {1 / R0:.3f})")
print(f"fórmula do pico, 1 - 1/R0 - ln(R0)/R0 = {100 * (1 - 1 / R0 - np.log(R0) / R0):.1f}%")

# --- O fim: quem pegou a doença, contra a equação r = 1 - exp(-R0 r)
rinf = 0.5
for _ in range(200):
    rinf = 1 - np.exp(-R0 * rinf)
print(f"no fim pegaram a doença: {100 * r[-1]:.1f}%   (fórmula: {100 * rinf:.1f}%)")

# --- Comparação com o SIS (mesmos beta, k, mu)
i_sis = [i0]
for t in range(T):
    i_sis.append(i_sis[-1] + beta * k * i_sis[-1] * (1 - i_sis[-1]) - mu * i_sis[-1])

ts = np.arange(T + 1)
plt.figure(figsize=(7, 4))
plt.plot(ts, s, lw=2, label="suscetíveis s")
plt.plot(ts, i, lw=2.5, label="infectados i (SIR)")
plt.plot(ts, r, lw=2, label="recuperados r")
plt.plot(ts, i_sis, "--", lw=1.5, label="infectados i (SIS)")
plt.axhline(1 / R0, color="0.5", ls=":", lw=1)
plt.axvline(tp, color="0.5", ls=":", lw=1)
plt.xlabel("passo t"); plt.ylabel("fração da população")
plt.title(f"SIR com R0 = {R0:.1f}: o pico acontece quando s cai a 1/R0")
plt.legend(fontsize=8); plt.tight_layout()
plt.show()
