# Wonderbound — Guia de Estrutura

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
| `wonderbound-parado.webp` | Parado (idle) |
| `wonderbound-andar.webp` | Andando |
| `wonderbound-pular.webp` | Pulando (folha em grade 10×17) |
| `btn-*.webp` | Botões da tela inicial (jogar, armadura, missões…) |
| `botao-voar.webp` | Botão de voar |
| `wonderbound-intro.webm` · `wonderbound-intro.mp4` · `wonderbound-logo.webp` | Vídeo (WebM/VP9 com fallback MP4/H.264) e logo da tela inicial |

> Correr vem de imagem hospedada fora (`i.ibb.co`) — o link está no gêmeo
> `js/assets/wonderbound-correr.js`. O CENÁRIO do hangar fica em `assets/cenario/`
> (`tileset.webp` = arte das peças, `emissivo.webp` = máscaras de luz) — ver
> a seção 6.

## 3. Quem CONFIGURA cada folha — `js/assets/` (os "gêmeos")

Cada folha de sprite tem um arquivo de código com o **mesmo nome** da imagem.
Ex.: `assets/wonderbound-andar.webp` ↔ `js/assets/wonderbound-andar.js`. É **aqui** que você
edita a folha:

| Gêmeo | O que você edita |
|---|---|
| `js/assets/wonderbound-andar.js` | URL da folha, nº de quadros e a cadência (velocidade) do andar |
| `js/assets/wonderbound-parado.js` | quadros e fps do idle |
| `js/assets/wonderbound-correr.js` | URL e quadros da corrida |
| `js/assets/wonderbound-pular.js` | grade (colunas/linhas), **corte** (bodyR/footR), velocidade e quadros de decolagem/pouso |
| `js/assets/chao.js` | (desativado) a antiga imagem única do chão — o piso agora é tile do cenário |

> Observação sobre o "corte": nas tiras (andar/parado/correr) o corte/escala do
> corpo é **medido sozinho** em tempo real; o que você ajusta é nº de quadros e
> velocidade. Já no pulo (grade), o corte é manual em `bodyR`/`footR`.

## 4. Os arquivos, 1 linha cada (em `src/game/`)

| Arquivo | O que é / o que você edita |
|---|---|
| `render.js` ⭐ | O **cérebro**: laço principal — física + escolha do sprite + desenho. |
| `Wonderbound.jsx` | As **telas** e o fluxo (carregando → tela inicial → jogando); monta o render e os controles. |
| `sprites.js` | Junta os gêmeos de `js/assets/` e entrega os valores prontos (+ botões do menu). |
| `ajustes.js` | Números de ajuste fino: física, tamanho, velocidades, armas e cores. |
| `mundo.js` | Matemática pura do céu/sol/lua e do pulo. |
| `carregarSprites.js` | Baixa as folhas e **mede** cada quadro (autocalibração dos pés). |
| `controles.js` | Joysticks (mover/mirar), botão de voar e a onda dos botões do menu. |
| `estilos.js` | Visual das telas/HUD e as animações CSS. |
| `cenario/` ⭐ | O **hangar em tiles**: tileset, mapa em camadas, luzes dinâmicas e colisão (ver seção 6). |
| `../lib/supabase.js` · `../lib/playerSave.js` | Cliente Supabase e salvar/carregar o progresso. |

## 5. O que eu preciso editar? (tabela-resumo)

| O que eu quero fazer | Arquivos que edito |
|---|---|
| Trocar a arte de um sprite | a imagem em `assets/` + o gêmeo em `js/assets/` (e subo o `?v=N`) |
| Mudar quadros/velocidade/corte de uma animação | só o gêmeo em `js/assets/` |
| Afinar física, tamanho, velocidades ou cores | `ajustes.js` |
| Mudar **quando/como** um sprite aparece (prioridade) | `render.js` |
| Mexer nos joysticks / botão de voar | `controles.js` |
| Mudar as telas, botões do menu ou HUD | `Wonderbound.jsx` (visual em `estilos.js`) |
| Mudar o que é salvo na nuvem | `../lib/playerSave.js` |
| Mover/adicionar objetos, luzes ou colisões do cenário | `src/game/cenario/mapa.js` |
| Mudar cor/intensidade das luzes ou criar presets | `src/game/cenario/luzes.js` |

## 6. O CENÁRIO modular (hangar) — `src/game/cenario/`

O cenário não é uma imagem única: é um **tilemap** (estilo Stardew Valley).
A arte de referência foi fatiada em peças reutilizáveis e o hangar é montado
por código, em camadas, com luz dinâmica e colisão separada.

**Imagens** (em `assets/cenario/`):

| Arquivo | O que é |
|---|---|
| `tileset.webp` | Atlas com a arte BASE de cada peça (parede, coluna, janela, lâmpada, piso, caixas, estante, plataforma, viga) — com a iluminação removida (de-bake) |
| `emissivo.webp` | Atlas com as LUZES (cubo holográfico, barras da plataforma, linha do piso, lâmpadas, janelas, reflexo) como máscaras neutras — a cor é aplicada em tempo real |

**Código** (em `src/game/cenario/`):

| Arquivo | O que você edita |
|---|---|
| `tileset.js` | Retângulos de cada peça dentro dos atlas (+ URLs `?v=N`) |
| `mapa.js` ⭐ | O MAPA: camadas `fundo` / `chao` / `objetos` / `frente` / `luzes` e as caixas de `COLISOES`. Posições em px do mundo; objetos têm `baseZ` (profundidade no piso) |
| `luzes.js` ⭐ | Grupos de luz (cor/saturação/brilho/intensidade/opacidade/pulso) e os PRESETS (`claro`, `escuro`, `noturno`, `alerta`, `futurista`) |
| `desenhar.js` | Desenho das camadas + tint dos emissivos + lista p/ depth sorting |
| `colisao.js` | Resolução de colisão (x/z) e altura de apoio (subir na plataforma/caixas) |

Como funciona no jogo:

- O personagem anda também em **profundidade** (joystick para cima/baixo) e o
  **depth sorting** decide se ele fica atrás ou na frente de cada objeto.
- Caixas/estante/plataforma **bloqueiam** a passagem (`COLISOES`); as com
  `sobe: true` permitem aterrissar em cima (pulo/voo).
- Nenhuma luz está gravada na arte: o relógio do jogo pinta as janelas e a luz
  ambiente; os presets trocam o clima inteiro em tempo real. No console:
  `window.WONDERBOUND_CENARIO.aplicarPreset('alerta')` ou
  `window.WONDERBOUND_CENARIO.definirLuz('cubo', { cor: '#ff44cc', intensidade: 1.2 })`.
