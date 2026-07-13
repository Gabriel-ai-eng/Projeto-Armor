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
    if (x >= c.x - RAIO_X && x <= c.x + c.w + RAIO_X &&
        z >= c.z && z <= c.z + c.d) {
      if (c.altura > solo) solo = c.altura;
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
    if (p.x <= l || p.x >= r || p.z <= t || p.z >= b) continue;
    // penetração em cada eixo → sai pelo lado mais raso
    const px = Math.min(p.x - l, r - p.x);
    const pz = Math.min(p.z - t, b - p.z);
    if (px < pz) {
      p.x += px > 0 ? -1 : 1; // empurra na direção correta
      p.vx = 0;
    } else {
      p.z += pz > 0 ? -1 : 1;
      p.vz = 0;
    }
  }

  // Verifica se o jogador está na região do cubo
  const inCubeRegion = (
    p.x >= AREA_CUBO.minX - RAIO_X &&
    p.x <= AREA_CUBO.maxX + RAIO_X &&
    p.z >= AREA_CUBO.minZ - RAIO_Z &&
    p.z <= AREA_CUBO.maxZ + RAIO_Z
  );

  if (inCubeRegion) {
    // Calcula penetração nas bordas do cubo
    const penLeft = p.x - (AREA_CUBO.minX - RAIO_X);
    const penRight = (AREA_CUBO.maxX + RAIO_X) - p.x;
    const penTop = p.z - (AREA_CUBO.minZ - RAIO_Z);
    const penBottom = (AREA_CUBO.maxZ + RAIO_Z) - p.z;

    // Se estiver fora dos limites seguros do cubo, resolve a colisão
    if (penLeft < 0 || penRight < 0 || penTop < 0 || penBottom < 0) {
      const px = Math.min(Math.abs(penLeft), Math.abs(penRight));
      const pz = Math.min(Math.abs(penTop), Math.abs(penBottom));

      if (px < pz) {
        // Corrige em X
        p.x = penLeft < penRight ? (AREA_CUBO.minX - RAIO_X) : (AREA_CUBO.maxX + RAIO_X);
        p.vx = 0;
      } else {
        // Corrige em Z
        p.z = penTop < penBottom ? (AREA_CUBO.minZ - RAIO_Z) : (AREA_CUBO.maxZ + RAIO_Z);
        p.vz = 0;
      }
      p.z = Math.max(Z_MIN, Math.min(Z_MAX, p.z));
    }
  }
}

export const AREA_CUBO = {
  minX: 720,
  maxX: 844,
  minZ: 24,
  maxZ: 38,
  maxY: 200, // <-- ADICIONE ISSO: Altura máxima do teto (ajuste o número se o teto visual ficar mais alto/baixo)
};
