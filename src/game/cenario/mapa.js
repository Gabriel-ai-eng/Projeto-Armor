// ============================================================
// CENÁRIO · MAPA (tilemap editável do hangar)
// Aqui você monta o cenário peça por peça, como num editor de mapa:
// cada item diz QUAL tile usar e ONDE ficar. Tudo em px do MUNDO.
//
// Sistema de coordenadas:
//   • x cresce para a direita (mundo vai de 0 a WORLD_W=1700).
//   • y = 0 é a LINHA DO CHÃO (base da parede). Parede/janelas usam y
//     negativo (para cima); o piso desce de 0 até PISO_H.
//   • O piso é uma FAIXA DE PROFUNDIDADE: o personagem anda nela para
//     "dentro" (z pequeno = fundo) e para "fora" (z grande = frente).
//     Objetos têm `baseZ` = onde a base deles apoia no piso; o depth
//     sorting compara o z do personagem com o baseZ de cada objeto para
//     decidir quem fica na frente.
//
// Camadas (desenhadas nesta ordem):
//   fundo   → parede, colunas, vigas, janelas, lâmpadas (atrás de tudo)
//   chao    → piso (os objetos e o personagem pisam nele)
//   objetos → caixas/estante/plataforma — ordenados por baseZ junto com o
//             personagem (ficar atrás/na frente é automático)
//   frente  → o que deve SEMPRE cobrir o personagem
//   luzes   → emissives com tint dinâmico (cores em luzes.js)
//   colisão → retângulos independentes em COLISOES (edite à vontade)
// ============================================================
import { TILES, LUZES_SPRITES } from './tileset';

// Escala global: px da arte original → px do mundo.
export const TS = 0.5;

// Geometria do cenário no mundo
export const PAREDE_H = Math.round(TILES.parede.h * TS);  // 345 — altura da parede
export const PISO_H = Math.round(TILES.piso.h * TS);      // 103 — profundidade do piso
export const Z_MIN = 8, Z_MAX = 96;                       // faixa em que dá pra andar
export const Z_INICIAL = 46;                              // profundidade inicial dos pés

// ======================================================
// Área do cubo holográfico (limites de confinamento)
// Usado pelo colisao.js para manter o Armor preso dentro do cubo.
// ======================================================
export const AREA_CUBO = {
  minX: 720,
  maxX: 844,
  minZ: 24,
  maxZ: 38,
};

const wh = (t, ts = TS) => ({ w: t.w * ts, h: t.h * ts });

// Posições compartilhadas (mesmo x para a peça "apagada" e a sua luz)
const JANELAS_X = [167, 557, 977, 1367];    // canto esquerdo de cada janela
const LAMPADAS_X = [300, 540, 1120, 1360];  // canto esquerdo de cada lâmpada

export const CAMADAS = {
  fundo: [
    { tile: 'parede', repetirX: true, y: -PAREDE_H },
    { tile: 'viga', x: 40, y: -140 },
    { tile: 'viga', x: 1240, y: -140 },
    { tile: 'coluna', x: 136, y: -PAREDE_H },
    { tile: 'coluna', x: 561, y: -PAREDE_H },
    { tile: 'coluna', x: 986, y: -PAREDE_H },
    { tile: 'coluna', x: 1411, y: -PAREDE_H },
    ...JANELAS_X.map((x) => ({ tile: 'janela', x, y: -262 })),
    ...LAMPADAS_X.map((x) => ({ tile: 'lampada', x, y: -PAREDE_H })),
  ],
  chao: [
    { tile: 'piso', repetirX: true, y: 0 },
  ],
  objetos: [
    { tile: 'caixasGrandes', x: 40, baseZ: 30 },
    { tile: 'caixaP1', x: 205, baseZ: 56 },
    { tile: 'plataforma', x: 676, baseZ: 40 },
    { tile: 'caixasMedias', x: 1080, baseZ: 34 },
    { tile: 'caixaP2', x: 1290, baseZ: 66 },
    { tile: 'estante', x: 1530, baseZ: 26 },
  ],
  frente: [
    // vazio por padrão — mova objetos para cá se quiserem SEMPRE cobrir o
    // personagem (ex.: { tile: 'caixaP1', x: 500, y: 30 })
  ],
  luzes: [
    // `plano` diz ONDE a luz entra no desenho, para NUNCA cobrir o personagem
    // indevidamente:
    //   'fundo'  → logo após a parede (janelas, lâmpadas)
    //   'chao'   → logo após o piso (linha do rodapé, reflexos)
    //   baseZ    → entra no DEPTH SORTING junto com objetos e personagem
    //              (luzes presas a um objeto, como a plataforma e o cubo)

    // Cubo holográfico: apoiado no topo da plataforma; baseZ um pouco antes
    // do da plataforma (ele "nasce" do centro dela, atrás da borda frontal)
    { luz: 'cubo', grupo: 'cubo', x: 738, y: -252, baseZ: 32 },
    // Barras/aro da plataforma: coladas ao tile apagado, mesmo z dele
    { luz: 'plataformaLuz', grupo: 'plataforma', x: 676, y: -45, baseZ: 40.5 },
    // Linha luminosa do rodapé, atravessando o mundo inteiro
    { luz: 'linhaPiso', grupo: 'linhaPiso', repetirX: true, y: -5, plano: 'chao' },
    // Reflexo do cubo/plataforma no piso, em frente à plataforma
    { luz: 'reflexo', grupo: 'reflexo', x: 680, y: 40, plano: 'chao' },
    ...LAMPADAS_X.map((x) => ({ luz: 'lampadaLuz', grupo: 'lampadas', x: x - 16, y: -247, plano: 'fundo' })),
    ...JANELAS_X.map((x) => ({ luz: 'janelaLuz', grupo: 'janelas', x, y: -262, plano: 'fundo' })),
  ],
};

// ---- COLISÕES (independentes do desenho — edite à vontade) ----
// Cada caixa: x/w no eixo horizontal; z/d na profundidade do piso; `altura` é
// o quanto o obstáculo sobe (pulo/voo por cima passa). `sobe: true` = dá para
// FICAR EM CIMA (aterrissar do pulo/voo).
export const COLISOES = [
  { id: 'plataforma', x: 676, w: 348, z: 18, d: 26, altura: 72, sobe: true },
  { id: 'caixasGrandes', x: 40, w: 155, z: 14, d: 24, altura: 116 },
  { id: 'caixaP1', x: 205, w: 48, z: 48, d: 14, altura: 40, sobe: true },
  { id: 'caixasMedias', x: 1080, w: 98, z: 22, d: 16, altura: 48, sobe: true },
  { id: 'caixaP2', x: 1290, w: 39, z: 58, d: 14, altura: 35, sobe: true },
  { id: 'estante', x: 1530, w: 130, z: 12, d: 22, altura: 144 },

  // ======================================================
  // Cubo holográfico (paredes invisíveis)
  // Mantém o Armor preso dentro do cubo.
  // ======================================================
  { id: 'cubo_esquerda', x: 720, w: 4, z: 24, d: 18, altura: 500 },
  { id: 'cubo_direita',  x: 844, w: 4, z: 24, d: 18, altura: 500 },
  { id: 'cubo_fundo',    x: 720, w: 128, z: 24, d: 4, altura: 500 },
  { id: 'cubo_frente',   x: 720, w: 128, z: 38, d: 4, altura: 500 },
];

// Tamanho de cada peça no mundo (derivado do atlas × escala) — usado pelo
// desenho e útil para posicionar itens novos no mapa.
export const TAM = Object.fromEntries(
  Object.entries(TILES).map(([n, t]) => [n, wh(t)])
);
export const TAM_LUZ = Object.fromEntries(
  Object.entries(LUZES_SPRITES).map(([n, t]) => [n, wh(t)])
);
