# Projeto Armor

Jogo **Projeto Armor — Capítulo 1: O Despertar**, em React + Vite.

Originalmente fazia parte do AlpsPrime-OS (app da home, em `src/pages/ProjetoArmor.jsx`).
Aqui ele vive como projeto independente, podendo ser rodado e publicado sozinho.

## Como rodar

```bash
npm install
npm run dev      # ambiente de desenvolvimento
npm run build    # build de produção (saída em dist/)
npm run preview  # pré-visualiza o build
```

## Estrutura

- `src/game/ProjetoArmor.jsx` — o jogo completo (canvas 2D, HUD de toque, física, sprites).
- `src/App.jsx` — monta o jogo em tela cheia.
- `public/armor-bg.webp`, `public/armor-logo.webp` — arte/identidade do Projeto Armor.

## Controles (em paisagem)

- **Esquerda** move · **Direita** mira
- Botões: **Tiro** · **Míssil** · **Voar**

O jogo é em paisagem: em retrato aparece a animação "VIRE O CELULAR".

## Notas

- Os sprites do personagem e do chão são carregados de URLs externas (i.ibb.co),
  como no projeto original.
- O componente `ProjetoArmor` aceita uma prop opcional `onVoltar`; quando fornecida,
  exibe o botão "← Sair" (usado quando embutido em outro app, como o AlpsPrime-OS).
  No app standalone ela não é passada, então não há botão de sair.
