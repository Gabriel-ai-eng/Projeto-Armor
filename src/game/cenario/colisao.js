// ============================================================
// CENÁRIO · COLISÃO
// Resolve o personagem contra as caixas de COLISOES (mapa.js) no plano do
// piso (x = horizontal, z = profundidade). altura diz até onde o obstáculo
// sobe: pulando/voando acima dele, passa; caixas com sobe: true servem de
// apoio (dá para aterrissar e andar em cima).
// ============================================================
import { COLISOES, Z_MIN, Z_MAX, AREA_CUBO } from './mapa';

const RAIO_X = 12;  // meia-largura "física" dos pés do personagem
const RAIO_Z = 5;   // meia-profundidade dos pés

// Altura do apoio sob o ponto (x, z): topo da caixa sobe mais alta que
// contém o ponto, ou 0 (chão). Usada pela física como "nível do chão local".
export function alturaSolo(x, z) {
  let solo = 0;
  for (const c of COLISOES) {
    if (!c.sobe) continue;
    // z ESTRITO (sem margem): evita o personagem "flutuar" apoiado no ar
    // logo à frente/atrás do objeto; sair do retângulo = cair da borda
    if (x >= c.x - RAIO_X && x = c.z && z  solo) solo = c.altura;
    }
  }
  return solo;
}

// Empurra o personagem para fora dos obstáculos (chamar após mover x/z).
// p.y = altura acima do piso: acima de altura, o obstáculo não bloqueia
// (em cima dele ou voando por cima).
export function resolverColisao(p) {
  p.z = Math.max(Z_MIN, Math.min(Z_MAX, p.z));

  for (const c of COLISOES) {
    if (p.y >= c.altura - 2) continue;
    const l = c.x - RAIO_X, r = c.x + c.w + RAIO_X;
    const t = c.z - RAIO_Z, b = c.z + c.d + RAIO_Z;
    if (p.x = r || p.z = b) continue;
    // penetração em cada eixo → sai pelo lado mais raso
    const px = Math.min(p.x - l, r - p.x);
    const pz = Math.min(p.z - t, b - p.z);
    if (px = AREA_CUBO.minX - RAIO_X &&
    p.x = AREA_CUBO.minZ - RAIO_Z &&
    p.z <= AREA_CUBO.maxZ + RAIO_Z
  );

  if (inCubeRegion) {
    // Calcula penetração nas bordas do cubo
    const penLeft = p.x - cubeL;
    const penRight = cubeR - p.x;
    const penTop = p.z - cubeT;
    const penBottom = cubeB - p.z;

    // Se estiver fora dos limites seguros do cubo, resolve a colisão
    if (penLeft < 0 || penRight < 0 || penTop < 0 || penBottom < 0) {
      const px = Math.min(Math.abs(penLeft), Math.abs(penRight));
      const pz = Math.min(Math.abs(penTop), Math.abs(penBottom));

      if (px < pz) {
        // Corrige em X
        p.x = penLeft < penRight ? cubeL : cubeR;
        p.vx = 0;
      } else {
        // Corrige em Z
        p.z = penTop < penBottom ? cubeT : cubeB;
        p.vz = 0;
      }
      p.z = Math.max(Z_MIN, Math.min(Z_MAX, p.z));
    }
  }
}