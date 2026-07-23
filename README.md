# Wonderbound

Jogo **Wonderbound — Capítulo 1: O Despertar**, em React + Vite.

Originalmente fazia parte do AlpsPrime-OS (app da home, em `src/pages/Wonderbound.jsx`).
Aqui ele vive como projeto independente, podendo ser rodado e publicado sozinho.

## Como rodar

```bash
npm install
npm run dev      # ambiente de desenvolvimento
npm run build    # build de produção (saída em dist/)
npm run preview  # pré-visualiza o build
```

## Estrutura

- `src/game/Wonderbound.jsx` — o jogo completo (canvas 2D, HUD de toque, física, sprites).
- `src/App.jsx` — monta o jogo em tela cheia.
- `public/wonderbound-bg.webp`, `public/wonderbound-logo.webp` — arte/identidade do Wonderbound.

## Controles (em paisagem)

- **Esquerda** move · **Direita** mira
- Botões: **Tiro** · **Míssil** · **Voar**

O jogo é em paisagem: em retrato aparece a animação "VIRE O CELULAR".

## Publicação sob o domínio da plataforma (`alpsprime.com.br/jogo`)

Este repositório/deploy continua **separado**, mas o jogo é servido **sob o
caminho `/jogo` do domínio da plataforma** (`alpsprime.com.br/jogo`), via
rewrite/proxy configurado no `vercel.json` do AlpsPrime-OS. Por isso:

- `vite.config.js` usa `base: '/jogo/'` — todos os assets são referenciados com
  esse prefixo (o proxy da plataforma remove o `/jogo` ao repassar para este
  deploy). Assets da pasta `public/` devem ser referenciados via
  `import.meta.env.BASE_URL` (helper `asset()` em `Wonderbound.jsx`).
- Como fica na **mesma origem** da plataforma, o jogo **reaproveita a sessão de
  login** já feita nela (mesmo `localStorage`, mesmo projeto Supabase). O
  jogador **não faz login/cadastro de novo** e o progresso é salvo na tabela
  `armor_game_state` pela conta do usuário (`auth.uid()`), protegida por RLS —
  ver `src/lib/playerSave.js`.
- Abrir este deploy **diretamente** (fora do domínio da plataforma) não é o
  fluxo suportado: sem sessão o progresso não é salvo, e os assets esperam o
  prefixo `/jogo`.

## Notas

- Os sprites do personagem e do chão são carregados de URLs externas (i.ibb.co),
  como no projeto original.
- O componente `Wonderbound` aceita uma prop opcional `onVoltar`; quando fornecida,
  exibe o botão "← Sair" (usado quando embutido em outro app, como o AlpsPrime-OS).
  No app standalone ela não é passada, então não há botão de sair.
