"""Dashboard de vendas Pixel Store.
Uso: python dashboard.py dados_demo.json --output painel_pixelstore.png
Pacotes: pip install matplotlib
"""

import argparse
import json
from pathlib import Path
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

BG = "#0D101B"
PANEL = "#1A1F30"
TEXT = "#F4F3FF"
MUTED = "#B1B9D0"
PURPLE = "#9671FF"
CYAN = "#62C8E8"
GOLD = "#F4C86C"


def brl(cents):
    return "R$ " + f"{cents/100:,.2f}".replace(",", "X").replace(".", ",").replace(
        "X", "."
    )


def make_dashboard(data, output):
    summary = data["indicadores"]
    platforms = data["vendas_por_plataforma"]
    months = data["vendas_por_mes"]
    top = data["produtos_mais_vendidos"][:6]
    fig = plt.figure(figsize=(15, 10), facecolor=BG)
    fig.text(
        0.05,
        0.955,
        "PIXELSTORE  /  DATA LAB",
        color=PURPLE,
        fontsize=12,
        fontweight="bold",
    )
    fig.text(
        0.05, 0.91, "Dashboard de vendas", color=TEXT, fontsize=27, fontweight="bold"
    )
    fig.text(
        0.05,
        0.876,
        f"Fonte: exportação JSON • {data.get('ambiente', 'não identificado')} • Uso acadêmico",
        color=MUTED,
        fontsize=10,
    )
    stats = [
        ("Receita total", brl(summary["receita_centavos"])),
        ("Pedidos", str(summary["pedidos"])),
        ("Produtos", str(summary["produtos_ativos"])),
        ("Clientes", str(summary["clientes"])),
    ]
    for i, (label, value) in enumerate(stats):
        ax = fig.add_axes([0.05 + 0.23 * i, 0.715, 0.215, 0.13], facecolor=PANEL)
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_visible(False)
        ax.text(
            0.05, 0.72, label.upper(), fontsize=10, color=MUTED, transform=ax.transAxes
        )
        ax.text(
            0.05,
            0.26,
            value,
            fontsize=21,
            fontweight="bold",
            color=TEXT,
            transform=ax.transAxes,
        )
    layout = [
        [0.175, 0.395, 0.305, 0.275],
        [0.545, 0.395, 0.405, 0.275],
        [0.175, 0.07, 0.305, 0.23],
        [0.545, 0.07, 0.405, 0.23],
    ]
    axes = [fig.add_axes(x, facecolor=PANEL) for x in layout]
    for ax in axes:
        for s in ax.spines.values():
            s.set_visible(False)
        ax.tick_params(colors=MUTED, labelsize=9, length=0)
        ax.title.set_color(TEXT)
        ax.grid(axis="x", color="#35384C", alpha=0.5)
        ax.set_axisbelow(True)
    a, b, c, d = axes
    a.set_title(
        "Receita por plataforma", fontweight="bold", loc="left", pad=12, color=TEXT
    )
    if platforms:
        names = [x["platform"] for x in platforms]
        values = [x["receita_centavos"] / 100 for x in platforms]
        a.barh(names[::-1], values[::-1], color=PURPLE, height=0.6)
        a.set_xlim(0, max(values) * 1.20)
        a.tick_params(axis="y", colors=TEXT)
        for i, value in enumerate(values[::-1]):
            a.text(
                value + 0.3, i, f"R$ {value:.0f}", color=TEXT, va="center", fontsize=9
            )
    else:
        a.text(0.5, 0.5, "Sem vendas", color=MUTED, ha="center", transform=a.transAxes)
    b.set_title(
        "Receita mensal (R$)", fontweight="bold", loc="left", pad=12, color=TEXT
    )
    if months:
        b.plot(
            [m["mes"] for m in months],
            [m["receita_centavos"] / 100 for m in months],
            color=CYAN,
            marker="o",
            linewidth=2.6,
        )
        b.tick_params(axis="x", rotation=12)
        b.grid(axis="y", color="#35384C", alpha=0.5)
    else:
        b.text(0.5, 0.5, "Sem vendas", color=MUTED, ha="center", transform=b.transAxes)
    c.set_title(
        "Top jogos vendidos (unidades)",
        fontweight="bold",
        loc="left",
        pad=12,
        color=TEXT,
    )
    if top:
        names = [x["titulo"][:21] for x in top][::-1]
        values = [x["unidades"] for x in top][::-1]
        c.barh(names, values, color=GOLD, height=0.6)
        c.tick_params(axis="y", colors=TEXT)
        c.set_xlim(0, max(values) * 1.2)
    else:
        c.text(0.5, 0.5, "Sem vendas", color=MUTED, ha="center", transform=c.transAxes)
    d.set_title(
        "Participação da receita", fontweight="bold", loc="left", pad=12, color=TEXT
    )
    if platforms:
        d.pie(
            [x["receita_centavos"] for x in platforms],
            labels=[x["platform"] for x in platforms],
            autopct="%1.0f%%",
            startangle=90,
            textprops={"color": TEXT, "fontsize": 10},
            colors=[PURPLE, CYAN, GOLD, "#6FDAAF"],
            wedgeprops={"edgecolor": PANEL, "linewidth": 2},
        )
    else:
        d.text(0.5, 0.5, "Sem vendas", color=MUTED, ha="center", transform=d.transAxes)
    fig.text(
        0.05,
        0.015,
        "* Valores de pedidos simulados são identificados no JSON. Não representam vendas ou pagamentos reais.",
        color=MUTED,
        fontsize=9,
    )
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output, facecolor=BG, dpi=170)
    plt.close(fig)
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("json", nargs="?", default="dados_demo.json")
    parser.add_argument("--output", default="dashboard.png")
    args = parser.parse_args()
    source = Path(args.json)
    with source.open(encoding="utf-8") as file:
        data = json.load(file)
    print(f"Dashboard criado: {make_dashboard(data,args.output).resolve()}")
