# Projeto Armor — Guia de Estrutura

Como o código está organizado, no mesmo espírito do **Free Kick World**: as
imagens ficam em `public/`, cada assunto tem seu arquivo com nome do que faz, e
um "cérebro" (o **motor**) decide e desenha tudo a cada frame.

## 1. Visão geral em 1 frase

As **imagens** ficam em `public/`; a **configuração de cada folha de sprite**
fica em `src/game/sprites.js`; e quem **anima e desenha** o jogo a cada frame é
o **motor** em `src/game/motor.js`.

## 2. Onde estão as IMAGENS

Todas em `public/` — são WebP puros, sem código:

| Arquivo | O que é |
|---|---|
| `armor-parado.webp` | Parado (idle) |
| `armor-andar.webp` | Andando |
| `armor-pular.webp` | Pulando (folha em grade 10×17) |
| `btn-*.webp` | Botões da tela inicial (jogar, armadura, missões…) |
| `botao-voar.webp` | Botão de voar |

> Correr e o chão vêm de imagens hospedadas fora (`i.ibb.co`) — os links estão
> em `sprites.js`.

## 3. Os arquivos, 1 linha cada (em `src/game/`)

| Arquivo | O que é / o que você edita |
|---|---|
| `ProjetoArmor.jsx` | As **telas** e o fluxo (carregando → tela inicial → jogando), o vídeo da intro, os botões e o HUD. Monta o motor e os controles. |
| `ajustes.js` | **Números de ajuste fino**: tamanho do personagem, física (gravidade, pulo, voo), velocidades, armas e cores. |
| `sprites.js` | **Folhas de sprite** (o "gêmeo" de cada imagem): URL com `?v=N`, grade (quadros/colunas/linhas) e velocidade. Também os botões do menu. |
| `mundo.js` | Matemática pura do céu/sol/lua e da altura do pulo. |
| `carregarSprites.js` | Baixa as folhas e **mede** cada quadro (autocalibração dos pés). |
| `motor.js` | ⭐ O **cérebro**: o laço principal — física + escolha do sprite + desenho. |
| `controles.js` | Os **joysticks** (mover/mirar), o botão de **voar** e a onda dos botões do menu. |
| `estilos.js` | Visual das telas/HUD (`es`) e as animações CSS (`CSS_ARMOR`). |
| `../lib/supabase.js` | Cliente Supabase (mesma conta da plataforma). |
| `../lib/playerSave.js` | Salvar/carregar o progresso do jogador na nuvem. |

## 4. O que eu preciso editar? (tabela-resumo)

| O que eu quero fazer | Arquivos que edito |
|---|---|
| Trocar a arte de um sprite existente | a imagem em `public/` + os números da folha em `sprites.js` (e subo o `?v=N`) |
| Mudar velocidade/quadros de uma animação | só a folha em `sprites.js` |
| Afinar física, tamanho, velocidades ou cores | `ajustes.js` |
| Mudar **quando/como** um sprite aparece (prioridade) | `motor.js` (a escolha do `modo` no laço) |
| Mexer nos joysticks / botão de voar | `controles.js` |
| Mudar as telas, botões do menu ou HUD | `ProjetoArmor.jsx` (e o visual em `estilos.js`) |
| Mudar o que é salvo na nuvem | `../lib/playerSave.js` |

## 5. Como as peças se encaixam

```
ProjetoArmor.jsx  (telas + estados + efeitos)
      │  carregarSprites()  →  baixa/mede as folhas
      │  criarControles(...) →  joysticks + voar  →  escrevem em moveRef / aimRef
      └─ criarLoop(...)     →  motor.js  (lê ajustes.js, sprites.js, mundo.js)
                                 a cada frame: física → escolhe sprite → desenha
```
