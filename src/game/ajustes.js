// ============================================================
// PROJETO ARMOR · AJUSTES FINOS
// Só os números que "afinam" o jogo: tamanho, mundo, câmera, física,
// velocidades, armas e cores. Mexer aqui muda o comportamento/aparência
// sem tocar na lógica.
//
// (A config das FOLHAS de sprite — imagem, grade e velocidade — fica em
//  sprites.js, do mesmo jeito que o arquivo "gêmeo" de cada sprite no
//  Free Kick World.)
// ============================================================

// ---------- Tamanho / mundo / câmera ----------
export const ALT = 360;              // altura do mundo em px (antes do RENDER_SCALE)
export const RENDER_SCALE = 2;       // canvas desenhado em 2x → mais nítido
export const WORLD_W = 1700;         // largura do mundo (limites de caminhada)
export const ALTURA_ARMOR = 105;     // altura do personagem em px do mundo
export const ZOOM_PERTO = 1.7;       // zoom do modo "perto"
export const ALTURA_IMG_CHAO = 230;  // altura desenhada da faixa de chão
export const LINHA_PES = 0.18;       // onde, na faixa de chão, ficam os pés (0..1)

// ---------- Velocidades horizontais ----------
// VEL_ANDAR é o teto da caminhada E o limite de corrida: acima dela o
// personagem está correndo e a animação de corrida assume.
export const VEL_ANDAR = 0.85;
export const VEL_CORRER = 6.4;
export const LIMIAR_CORRER = 0.75;   // inclinação do joystick que dispara a corrida

// ---------- Física vertical (pulo / voo) ----------
export const GRAV = 0.5, JUMP_V = 10, FLY_THRUST = 0.92, VY_MAX = 4.4, VY_FALL = 11, ALT_MAX = 210;

// ---------- Armas ----------
// TIRO: automático enquanto mira (joystick direito). MISSIL: golpe/rajada
// dourada disparada pelo botão LUTAR — mais forte e com cooldown maior.
export const COOLDOWN_TIRO = 8, COOLDOWN_MISSIL = 26, VEL_TIRO = 15, VEL_MISSIL = 8.5;

// ---------- Cores ----------
export const AZUL = '#6ED8FF', OURO = '#F0C040';
export const AZUL_RGB = [110, 216, 255], OURO_RGB = [240, 192, 64], FLY_RGB = [175, 228, 255];

// ---------- Cores do céu por fase do dia ----------
export const NOITE = [[7, 10, 22], [16, 26, 51], [28, 42, 71]];
export const DIA   = [[44, 111, 178], [92, 159, 214], [166, 203, 232]];
export const CREP  = [[36, 27, 58], [122, 63, 102], [224, 137, 79]];
