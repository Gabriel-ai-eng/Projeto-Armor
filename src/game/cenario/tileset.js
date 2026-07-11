// ============================================================
// CENÁRIO · TILESET (o "gêmeo" dos atlas em assets/cenario/)
// O cenário do hangar NÃO é mais uma imagem única: foi fatiado em TILES
// reutilizáveis (estilo Stardew Valley), empacotados em dois atlas:
//   • tileset.webp  — a ARTE base de cada peça, com a iluminação "assada"
//     REMOVIDA (de-bake): sem luz dinâmica, tudo fica em material neutro escuro.
//   • emissivo.webp — as LUZES como máscaras de luminância (cinza + alfa).
//     A cor NÃO está gravada no sprite: é aplicada em tempo real (tint), então
//     dá pra mudar cor/saturação/intensidade/brilho/opacidade sem redesenhar.
//
// Cada entrada é o retângulo {x, y, w, h} da peça dentro do atlas.
// Ao regenerar os atlas, suba o ?v=N para furar o cache do navegador.
// ============================================================
import { asset } from '../sprites';

export const URL_TILESET = asset('cenario/tileset.webp?v=1');
export const URL_EMISSIVO = asset('cenario/emissivo.webp?v=1');

// ---- Tiles base (arte sem luz) ----
export const TILES = {
  caixaP1:       { x: 531, y: 1103, w: 97,  h: 82  },  // caixa pequena dourada
  caixaP2:       { x: 630, y: 1103, w: 78,  h: 72  },  // caixa pequena escura
  caixasGrandes: { x: 0,   y: 693,  w: 310, h: 236 },  // pilha de caixas grandes
  caixasMedias:  { x: 333, y: 1103, w: 196, h: 98  },  // caixas médias agrupadas
  coluna:        { x: 62,  y: 0,    w: 55,  h: 691 },  // coluna estrutural treliçada
  estante:       { x: 201, y: 0,    w: 259, h: 290 },  // estante industrial com caixas
  janela:        { x: 0,   y: 1103, w: 331, h: 100 },  // janela superior (vidro apagado)
  lampada:       { x: 119, y: 0,    w: 80,  h: 300 },  // lâmpada suspensa + cabo
  parede:        { x: 0,   y: 0,    w: 60,  h: 691 },  // painel de parede (tileável em X)
  piso:          { x: 312, y: 693,  w: 256, h: 207 },  // piso metálico (tileável em X)
  plataforma:    { x: 0,   y: 931,  w: 696, h: 170 },  // plataforma central (luzes apagadas)
  viga:          { x: 462, y: 0,    w: 260, h: 265 },  // viga diagonal decorativa
};

// ---- Sprites de LUZ (máscaras emissivas; a cor vem de luzes.js) ----
export const LUZES_SPRITES = {
  cubo:          { x: 0,   y: 0,   w: 448, h: 433 },  // cubo holográfico inteiro
  janelaLuz:     { x: 0,   y: 607, w: 331, h: 100 },  // vidros acesos da janela
  lampadaLuz:    { x: 698, y: 435, w: 145, h: 165 },  // bulbo + cone de luz quente
  linhaPiso:     { x: 0,   y: 709, w: 512, h: 22  },  // linha luminosa do rodapé
  plataformaLuz: { x: 0,   y: 435, w: 696, h: 170 },  // barras/aro de luz da plataforma
  reflexo:       { x: 333, y: 607, w: 680, h: 85  },  // reflexo da luz no piso
};
