// ============================================================
// PROJETO ARMOR · FOLHAS DE SPRITE (o "gêmeo" de cada imagem)
// Mesma ideia do Free Kick World: as IMAGENS ficam em public/
// (armor-*.webp); AQUI fica a configuração de cada folha — a URL (com ?v=N
// para furar o cache do navegador), a grade (quadros/colunas/linhas) e a
// velocidade da animação.
//
// TROCAR um sprite que já existe = 2 lugares:
//   1) troco a imagem em public/
//   2) ajusto os números da folha aqui e subo o ?v=N
// O motor (motor.js) desenha qualquer folha que estes números descrevam —
// não precisa ser tocado.
// ============================================================

// Prefixo do deploy (definido pelo Vite): '/jogo/' em produção sob o domínio
// da plataforma, '/' no dev/standalone. Todo asset de public/ precisa dele
// para resolver corretamente através do proxy do domínio.
export const asset = (p) => import.meta.env.BASE_URL + p;

// Lado para o qual a arte do personagem "olha" na folha original.
export const SPRITE_OLHA_PARA = 'direita';

// ---- ANDAR: corpo pré-dimensionado; frame 0 = parado, 1..78 = ciclo ----
// A folha é pré-redimensionada (offline, Lanczos) para o corpo medir exatamente
// 105·RENDER_SCALE px: o canvas copia 1:1, sem reamostragem por frame → nítido.
export const SPRITE_ANDAR = asset('armor-andar.webp?v=12');
export const FRAMES_ANDAR = 79;    // frame 0 = parado; 1..78 = ciclo de caminhada
export const FRAME_PARADO = 0;     // frame usado se o idle não carregar
// Cadência FIXA da caminhada (medida do vídeo de referência): o ciclo fecha
// sempre em ~1,18 s — a velocidade do personagem NÃO muda o FPS do andar.
export const ANDAR_CICLO_TICKS = 71;                                          // ticks (60/s) por volta da folha
export const ANDAR_FRAMES_POR_TICK = (FRAMES_ANDAR - 1) / ANDAR_CICLO_TICKS;  // ≈1.10 quadros de sprite por tick

// ---- PARADO (idle animado): respiração/olhar em volta, em loop por tempo ----
export const SPRITE_PARADO_ANIM = asset('armor-parado.webp?v=5');
export const FRAMES_PARADO_ANIM = 100;  // folha do idle (1 de cada 3 frames do original)
export const PARADO_FPS = 10;           // 100 quadros a 10 fps = loop de ~10 s

// ---- CORRER (folha hospedada externamente) ----
export const SPRITE_CORRER = 'https://i.ibb.co/tTxmyXws/titan-correr-tira.png';
export const FRAMES_CORRER = 15;

// ---- PULAR: folha em GRADE (10 col x 17 lin = 170), lida em zigue-zague ----
// esquerda→direita, cima→baixo. Ciclo: agacha → impulso a jato → voo →
// aterrissagem com poeira → recupera e fica de pé.
export const SPRITE_PULAR = asset('armor-pular.webp?v=1');
export const PULAR_COLS = 10, PULAR_ROWS = 17, PULAR_FRAMES = 170;
export const PULAR_BODY_R = 0.797;  // altura do corpo ÷ altura da célula (frame em pé) → escala fixa
export const PULAR_FOOT_R = 0.12;   // distância dos pés até a base da célula (planta os pés no solo)
export const JUMP_ANIM_SPEED = 1.6; // quadros de sprite por tick (~1,8 s para os 170 frames)
export const JUMP_LAUNCH_F = 30;    // frame em que sai do chão (fim da anticipação)
export const JUMP_LAND_F = 129;     // frame em que aterrissa (impacto/poeira)
export const JUMP_ARC_H = 100;      // altura do arco do pulo (px)

// ---- CHÃO (imagem hospedada externamente) ----
export const IMG_CHAO = 'https://i.ibb.co/KzVkz7dS/11-20260612-202236-0000.png';

// ---- BOTÕES da tela inicial (imagem própria por botão, sobre o vídeo) ----
// Invisíveis em repouso; saltam e acendem ao serem pressionados. Posições e
// tamanhos em % do vídeo. Trocar a arte = trocar o .webp em public/.
export const BOTOES_INICIO = [
  { id: 'jogar',         src: asset('btn-jogar.webp'),         cx: 11.10, cy: 37.82, w: 20.4, aspect: 4.07 },
  { id: 'armadura',      src: asset('btn-armadura.webp'),      cx: 11.10, cy: 47.90, w: 16.9, aspect: 4.93 },
  { id: 'missoes',       src: asset('btn-missoes.webp'),       cx: 11.10, cy: 56.60, w: 16.8, aspect: 5.06 },
  { id: 'loja',          src: asset('btn-loja.webp'),          cx: 11.10, cy: 65.56, w: 16.9, aspect: 5.22 },
  { id: 'ranking',       src: asset('btn-ranking.webp'),       cx: 11.10, cy: 74.10, w: 16.8, aspect: 5.25 },
  { id: 'configuracoes', src: asset('btn-configuracoes.webp'), cx: 11.10, cy: 83.13, w: 16.9, aspect: 5.33 },
  { id: 'sair',          src: asset('btn-sair.webp'),          cx: 11.10, cy: 91.18, w: 17.1, aspect: 4.84 },
];
