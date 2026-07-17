# Gera os ícones da PWA (public/assets/icon-*.png) a partir de desenho
# vetorial simples: quadrado arredondado roxo da marca + raio branco.
#
# Uso:  python3 scripts/gerar-icones.py
#
# Tamanhos: 192 e 512 (manifest), 512 maskable (Android adaptativo,
# com margem de segurança de 20%), 180 (apple-touch-icon).
from PIL import Image, ImageDraw

ROXO = (102, 6, 235, 255)  # --color-accent do design system
BRANCO = (255, 255, 255, 255)

# Raio ⚡ desenhado num grid 100x100 (polígono fechado)
RAIO = [(57, 6), (26, 55), (45, 55), (40, 94), (74, 42), (53, 42)]


def desenhar(tamanho, maskable=False, cantos_arredondados=True):
    img = Image.new("RGBA", (tamanho, tamanho), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if maskable:
        # Maskable: fundo ocupa TUDO (o launcher recorta no formato dele)
        d.rectangle([0, 0, tamanho, tamanho], fill=ROXO)
        escala = 0.60  # raio menor, dentro da zona segura de 80%
    else:
        raio_canto = tamanho * 0.22 if cantos_arredondados else 0
        d.rounded_rectangle([0, 0, tamanho, tamanho], radius=raio_canto, fill=ROXO)
        escala = 0.78

    margem = tamanho * (1 - escala) / 2
    pontos = [
        (margem + x / 100 * tamanho * escala, margem + y / 100 * tamanho * escala)
        for x, y in RAIO
    ]
    d.polygon(pontos, fill=BRANCO)
    return img


saidas = {
    "public/assets/icon-192.png": desenhar(192),
    "public/assets/icon-512.png": desenhar(512),
    "public/assets/icon-512-maskable.png": desenhar(512, maskable=True),
    "public/assets/icon-180.png": desenhar(180),
}

for caminho, img in saidas.items():
    img.save(caminho)
    print(f"gerado: {caminho}")
