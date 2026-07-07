# Projeto Armor — Guia de Estrutura

Organizado no mesmo espírito do **Free Kick World**: as imagens ficam em
`assets/`, cada folha de sprite tem um arquivo "gêmeo" com o mesmo nome em
`js/assets/` (onde você edita quadros/corte/velocidade), e um "cérebro"
(`render.js`) que escolhe e desenha o sprite a cada frame.

## 1. Visão geral em 1 frase

As **imagens** ficam em `assets/`; a **configuração de cada folha** fica no
"gêmeo" com o mesmo nome em `js/assets/`; e quem **anima e desenha** é o
`render.js`.

## 2. Onde estão as IMAGENS

Todas em `assets/` — são WebP puros, sem código (o vídeo da intro também):

| Arquivo | O que é |
|---|---|
| `armor-parado.webp` | Parado (idle) |
| `armor-andar.webp` | Andando |
| `armor-pular.webp` | Pulando (folha em grade 10×17) |
| `btn-*.webp` | Botões da tela inicial (jogar, armadura, missões…) |
| `botao-voar.webp` | Botão de voar |
| `armor-intro.mp4` · `armor-logo.webp` | Vídeo e logo da tela inicial |

> Correr e o chão vêm de imagens hospedadas fora (`i.ibb.co`) — os links estão
> nos gêmeos `js/assets/armor-correr.js` e `js/assets/chao.js`.

## 3. Quem CONFIGURA cada folha — `js/assets/` (os "gêmeos")

Cada folha de sprite tem um arquivo de código com o **mesmo nome** da imagem.
Ex.: `assets/armor-andar.webp` ↔ `js/assets/armor-andar.js`. É **aqui** que você
edita a folha:

| Gêmeo | O que você edita |
|---|---|
| `js/assets/armor-andar.js` | URL da folha, nº de quadros e a cadência (velocidade) do andar |
| `js/assets/armor-parado.js` | quadros e fps do idle |
| `js/assets/armor-correr.js` | URL e quadros da corrida |
| `js/assets/armor-pular.js` | grade (colunas/linhas), **corte** (bodyR/footR), velocidade e quadros de decolagem/pouso |
| `js/assets/chao.js` | URL da imagem do chão |

> Observação sobre o "corte": nas tiras (andar/parado/correr) o corte/escala do
> corpo é **medido sozinho** em tempo real; o que você ajusta é nº de quadros e
> velocidade. Já no pulo (grade), o corte é manual em `bodyR`/`footR`.

## 4. Os arquivos, 1 linha cada (em `src/game/`)

| Arquivo | O que é / o que você edita |
|---|---|
| `render.js` ⭐ | O **cérebro**: laço principal — física + escolha do sprite + desenho. |
| `ProjetoArmor.jsx` | As **telas** e o fluxo (carregando → tela inicial → jogando); monta o render e os controles. |
| `sprites.js` | Junta os gêmeos de `js/assets/` e entrega os valores prontos (+ botões do menu). |
| `ajustes.js` | Números de ajuste fino: física, tamanho, velocidades, armas e cores. |
| `mundo.js` | Matemática pura do céu/sol/lua e do pulo. |
| `carregarSprites.js` | Baixa as folhas e **mede** cada quadro (autocalibração dos pés). |
| `controles.js` | Joysticks (mover/mirar), botão de voar e a onda dos botões do menu. |
| `estilos.js` | Visual das telas/HUD e as animações CSS. |
| `../lib/supabase.js` · `../lib/playerSave.js` | Cliente Supabase e salvar/carregar o progresso. |

## 5. O que eu preciso editar? (tabela-resumo)

| O que eu quero fazer | Arquivos que edito |
|---|---|
| Trocar a arte de um sprite | a imagem em `assets/` + o gêmeo em `js/assets/` (e subo o `?v=N`) |
| Mudar quadros/velocidade/corte de uma animação | só o gêmeo em `js/assets/` |
| Afinar física, tamanho, velocidades ou cores | `ajustes.js` |
| Mudar **quando/como** um sprite aparece (prioridade) | `render.js` |
| Mexer nos joysticks / botão de voar | `controles.js` |
| Mudar as telas, botões do menu ou HUD | `ProjetoArmor.jsx` (visual em `estilos.js`) |
| Mudar o que é salvo na nuvem | `../lib/playerSave.js` |
