// ============================================================
// CENÁRIO · COLISÃO
// Resolve o personagem contra as caixas de COLISOES (mapa.js) no plano do
// piso (x = horizontal, z = profundidade). `altura` diz até onde o obstáculo
// sobe: pulando/voando acima dele, passa; caixas com `sobe: true` servem de
// apoio (dá para aterrissar e andar em cima).
// ============================================================
import { COLISOES, Z_MIN, Z_MAX, AREA_CUBO, PAREDES_CUBO } from './mapa';

const RAIO_X = 12;  // meia-largura "física" dos pés do personagem
const RAIO_Z = 5;   // meia-profundidade dos pés

// Altura do apoio sob o ponto (x, z): topo da caixa `sobe` mais alta que
// contém o ponto, ou 0 (chão). Usada pela física como "nível do chão local".
export function alturaSolo(x, z) {
  let solo = 0;
  for (const c of COLISOES) {
    if (!c.sobe) continue;
    // z ESTRITO (sem margem): evita o personagem "flutuar" apoiado no ar
    // logo à frente/atrás do objeto; sair do retângulo = cair da borda
    if (x >= c.x - RAIO_X && x <= c.x + c.w + RAIO_X && z >= c.z && z <= c.z + c.d) {
      if (c.altura > solo) solo = c.altura;
    }
  }
  return solo;
}

// Empurra o personagem para fora dos obstáculos (chamar após mover x/z).
// p.y = altura acima do piso: acima de `altura`, o obstáculo não bloqueia
// (em cima dele ou voando por cima).
export function resolverColisao(p) {
  p.z = Math.max(Z_MIN, Math.min(Z_MAX, p.z));
  for (const c of COLISOES) {
    if (p.y >= c.altura - 2) continue;
    const l = c.x - RAIO_X, r = c.x + c.w + RAIO_X;
    const t = c.z - RAIO_Z, b = c.z + c.d + RAIO_Z;
    if (p.x <= l || p.x >= r || p.z <= t || p.z >= b) continue;
    // penetração em cada eixo → sai pelo lado mais raso
    const px = Math.min(p.x - l, r - p.x);
    const pz = Math.min(p.z - t, b - p.z);
    if (px < pz) { p.x = (p.x - l < r - p.x) ? l : r; p.vx = 0; }
    else { p.z = (p.z - t < b - p.z) ? t : b; p.vz = 0; }
    p.z = Math.max(Z_MIN, Math.min(Z_MAX, p.z));
  }

  // Paredes sólidas do cubo holográfico: sempre travadas (não só quando já
  // perto), senão um passo rápido o bastante escapa da margem num único
  // frame e o personagem nunca mais é contido.
  const cubeMinX = AREA_CUBO.minX - RAIO_X, cubeMaxX = AREA_CUBO.maxX + RAIO_X;
  const cubeMinZ = AREA_CUBO.minZ - RAIO_Z, cubeMaxZ = AREA_CUBO.maxZ + RAIO_Z;
  if (p.x < cubeMinX) { p.x = cubeMinX; p.vx = 0; }
  else if (p.x > cubeMaxX) { p.x = cubeMaxX; p.vx = 0; }
  if (p.z < cubeMinZ) { p.z = cubeMinZ; p.vz = 0; }
  else if (p.z > cubeMaxZ) { p.z = cubeMaxZ; p.vz = 0; }
}

// ============================================================
// CLIPPING PIXEL-PERFEITO NO CUBO (+ registro dos impactos)
// `ext` são as bordas VISÍVEIS do quadro ATUAL do sprite, em px do mundo,
// relativas a (p.x, linha dos pés) — medidas quadro a quadro pela
// autocalibração (carregarSprites.js) e traduzidas pelo render:
//   esq/dir  → pixel visível mais à esquerda/direita (dist. de p.x)
//   topo     → pixel visível mais alto (negativo = acima dos pés)
//   yEsq/yDir/xTopo → ONDE fica esse pixel extremo (punho, ombro, cabeça)
// Empurra o corpo de volta o mínimo necessário pra NENHUM pixel atravessar
// as faces internas do vidro (PAREDES_CUBO) — vale pra todo estado: andar,
// correr, soco, pulo, voo, agachar. Só APERTA o confinamento estático do
// resolverColisao acima (roda depois dele e nunca alarga limites).
// Cada contato novo (ou que deslizou >8px pela superfície) vira um impacto
// em `st.fx` — o render desenha ali o brilho de energia do cubo.
// ============================================================
const LADOS_CUBO = ['esq', 'dir', 'teto'];
export function clipparNoCubo(p, ext, st, agora) {
  const toca = {};
  if (p.x + ext.esq < PAREDES_CUBO.esq) { p.x = PAREDES_CUBO.esq - ext.esq; if (p.vx < 0) p.vx = 0; toca.esq = true; }
  if (p.x + ext.dir > PAREDES_CUBO.dir) { p.x = PAREDES_CUBO.dir - ext.dir; if (p.vx > 0) p.vx = 0; toca.dir = true; }
  // Teto: o pixel mais alto do quadro para no vidro de cima (p.y cresce pra
  // cima; o y do mundo do topo do sprite é p.z - p.y + ext.topo).
  const yMax = p.z + ext.topo - PAREDES_CUBO.teto;
  if (p.y > yMax) { p.y = yMax; if (p.vy > 0) p.vy = 0; toca.teto = true; }

  const pontos = {
    esq: [PAREDES_CUBO.esq, p.z - p.y + ext.yEsq],
    dir: [PAREDES_CUBO.dir, p.z - p.y + ext.yDir],
    teto: [p.x + ext.xTopo, PAREDES_CUBO.teto],
  };
  for (const lado of LADOS_CUBO) {
    if (!toca[lado]) continue;
    const [x, y] = pontos[lado];
    const ao = lado === 'teto' ? x : y;   // coordenada AO LONGO da superfície
    const antes = st.tocando[lado];
    const deslizou = antes && Math.abs((st.ponto[lado] ?? ao) - ao) > 8;
    // Um flash por contato (com cooldown), e outro se o ponto de contato
    // andou pela parede (ex.: soco esticando com o corpo já encostado) —
    // sem spam de brilho enquanto só fica parado apertando contra o vidro.
    if ((!antes || deslizou) && agora >= (st.cd[lado] || 0)) {
      st.fx.push({ x, y, lado, t0: agora });
      if (st.fx.length > 10) st.fx.shift();
      st.cd[lado] = agora + 9;
    }
    st.ponto[lado] = ao;
  }
  st.tocando = toca;
}