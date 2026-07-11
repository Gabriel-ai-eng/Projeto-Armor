// ============================================================
// PROJETO ARMOR · FOLHAS DE SPRITE (índice dos "gêmeos")
// Mesma ideia do Free Kick World:
//   • as IMAGENS ficam em  assets/        (armor-*.webp)
//   • a CONFIG de cada folha fica em  js/assets/<mesmo-nome>.js  (o "gêmeo"):
//     quadros, corte, velocidade — é LÁ que você edita cada sprite.
//
// Este arquivo só junta os gêmeos e entrega os valores prontos para o motor
// (render.js) e o carregador (carregarSprites.js). Para trocar/afinar um
// sprite, edite o arquivo em js/assets/ — não precisa mexer aqui.
// ============================================================
import ANDAR from '../../js/assets/armor-andar.js';
import PARADO from '../../js/assets/armor-parado.js';
import CORRER from '../../js/assets/armor-correr.js';
import PULAR from '../../js/assets/armor-pular.js';
import CHAO from '../../js/assets/chao.js';

// Prefixo do deploy (Vite): '/jogo/' em produção, '/' no dev. Todo arquivo de
// assets/ precisa dele para resolver através do proxy do domínio.
export const asset = (p) => import.meta.env.BASE_URL + p;
// URL final da folha: se for link externo (http...), usa direto; se for um
// arquivo local de assets/, ganha o prefixo do deploy.
const url = (s) => (s.startsWith('http') ? s : asset(s));

// Lado para o qual a arte do personagem "olha" na folha original.
export const SPRITE_OLHA_PARA = 'direita';

// ---- ANDAR (js/assets/armor-andar.js) ----
export const SPRITE_ANDAR = url(ANDAR.src);
export const FRAMES_ANDAR = ANDAR.frames;
export const FRAME_PARADO = ANDAR.frameParado;
export const ANDAR_CICLO_TICKS = ANDAR.cicloTicks;
export const ANDAR_FRAMES_POR_TICK = (FRAMES_ANDAR - 1) / ANDAR_CICLO_TICKS;

// ---- PARADO / idle (js/assets/armor-parado.js) ----
export const SPRITE_PARADO_ANIM = url(PARADO.src);
export const FRAMES_PARADO_ANIM = PARADO.frames;
export const PARADO_FPS = PARADO.fps;

// ---- CORRER (js/assets/armor-correr.js) ----
export const SPRITE_CORRER = url(CORRER.src);
export const FRAMES_CORRER = CORRER.frames;
export const CORRER_ALTURA_REL = CORRER.alturaRel ?? 1;

// ---- PULAR / grade (js/assets/armor-pular.js) ----
export const SPRITE_PULAR = url(PULAR.src);
export const PULAR_COLS = PULAR.cols, PULAR_ROWS = PULAR.rows, PULAR_FRAMES = PULAR.frames;
export const PULAR_BODY_R = PULAR.bodyR, PULAR_FOOT_R = PULAR.footR;
export const JUMP_ANIM_SPEED = PULAR.animSpeed;
export const JUMP_LAUNCH_F = PULAR.launchF, JUMP_LAND_F = PULAR.landF, JUMP_ARC_H = PULAR.arcH;

// ---- CHÃO (js/assets/chao.js) ----
export const IMG_CHAO = url(CHAO.src);

// ---- BOTÕES da tela inicial (imagens em assets/, não são folhas de animação) ----
// Invisíveis em repouso; saltam e acendem ao serem pressionados. Posições e
// tamanhos em % do vídeo. Trocar a arte = trocar o .webp em assets/.
export const BOTOES_INICIO = [
  { id: 'jogar',         src: asset('btn-jogar.webp'),         cx: 11.10, cy: 37.82, w: 20.4, aspect: 4.07 },
  { id: 'armadura',      src: asset('btn-armadura.webp'),      cx: 11.10, cy: 47.90, w: 16.9, aspect: 4.93 },
  { id: 'missoes',       src: asset('btn-missoes.webp'),       cx: 11.10, cy: 56.60, w: 16.8, aspect: 5.06 },
  { id: 'loja',          src: asset('btn-loja.webp'),          cx: 11.10, cy: 65.56, w: 16.9, aspect: 5.22 },
  { id: 'ranking',       src: asset('btn-ranking.webp'),       cx: 11.10, cy: 74.10, w: 16.8, aspect: 5.25 },
  { id: 'configuracoes', src: asset('btn-configuracoes.webp'), cx: 11.10, cy: 83.13, w: 16.9, aspect: 5.33 },
  { id: 'sair',          src: asset('btn-sair.webp'),          cx: 11.10, cy: 91.18, w: 17.1, aspect: 4.84 },
  // Diário / Amigos / Conquistas: canto superior direito, ao lado do perfil.
  // Posição/largura casadas com a arte impressa no vídeo (template matching) e
  // o `aspect` = proporção REAL de cada .webp — assim, em repouso o overlay
  // fica exatamente em cima da arte do vídeo e ao pressionar salta igual aos
  // demais (o mesmo scale 1.28 do .is-ativo).
  { id: 'diario',        src: asset('btn-diario.webp'),        cx: 86.55, cy: 32.80, w: 19.6, aspect: 4.52 },
  { id: 'amigos',        src: asset('btn-amigos.webp'),        cx: 86.55, cy: 42.50, w: 19.6, aspect: 4.44 },
  { id: 'conquistas',    src: asset('btn-conquistas.webp'),    cx: 86.55, cy: 52.70, w: 19.6, aspect: 4.01 },
];
