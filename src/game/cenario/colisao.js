// ============================================================
// CENÁRIO · COLISÃO
// Resolve o personagem contra as caixas de COLISOES (mapa.js) no plano do
// piso (x = horizontal, z = profundidade). `altura` diz até onde o obstáculo
// sobe: pulando/voando acima dele, passa; caixas com `sobe: true` servem de
// apoio (dá para aterrissar e andar em cima).
// ============================================================
import { COLISOES, Z_MIN, Z_MAX, AREA_CUBO } from './mapa';

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
  // Mantém z dentro dos limites globais do mundo
  p.z = Math.max(Z_MIN, Math.min(Z_MAX, p.z));

  // --- Resolver colisões tradicionais com caixas/obstáculos ---
  for (const c of COLISOES) {
    // Se o personagem está acima do topo do obstáculo, ele não colide com ele
    if (p.y >= c.altura - 2) continue;

    const l = c.x - RAIO_X;
    const r = c.x + c.w + RAIO_X;
    const t = c.z - RAIO_Z;
    const b = c.z + c.d + RAIO_Z;

    // Fora do retângulo expandido: sem colisão
    if (p.x <= l || p.x >= r || p.z <= t || p.z >= b) continue;

    // penetração em cada eixo → sai pelo lado mais raso
    const px = Math.min(p.x - l, r - p.x);
    const pz = Math.min(p.z - t, b - p.z);

    if (px < pz) {
      // empurra em x
      p.x = (p.x - l < r - p.x) ? l : r;
      p.vx = 0;
    } else {
      // empurra em z
      p.z = (p.z - t < b - p.z) ? t : b;
      p.vz = 0;
    }

    // garante z dentro dos limites após correção
    p.z = Math.max(Z_MIN, Math.min(Z_MAX, p.z));
  }

  // --- Confinamento lógico do cubo holográfico ---
  // Regras:
  //  • AREA_CUBO representa a área interna do cubo holográfico.
  //  • Não usamos COLISOES para as paredes do cubo.
  //  • Quando o personagem interage com o cubo (está dentro ou muito próximo),
  //    tratamos as bordas do cubo como limites físicos, resolvendo penetrações
  //    de forma consistente com o sistema de colisão existente.
  //
  // Estratégia:
  //  • Detectamos interação quando o personagem está dentro da região
  //    do cubo expandida pela "meia-extensão" física dos pés (RAIO_X/RAIO_Z).
  //  • Se houver penetração nas bordas do cubo, empurramos o personagem para
  //    dentro pelo eixo de menor penetração (mesma lógica usada para caixas).
  //  • Zeramos a velocidade no eixo corrigido para evitar "grudar" na parede.
  //
  // Observação: isso mantém a separação entre obstáculos físicos (COLISOES)
  // e o confinamento lógico do cubo (AREA_CUBO), permitindo que colisao.js
  // seja a única fonte de verdade para manter o personagem dentro do cubo.

  // Região de interação com o cubo (inclui margem física dos pés)
  const cubeInteractMinX = AREA_CUBO.minX - RAIO_X;
  const cubeInteractMaxX = AREA_CUBO.maxX + RAIO_X;
  const cubeInteractMinZ = AREA_CUBO.minZ - RAIO_Z;
  const cubeInteractMaxZ = AREA_CUBO.maxZ + RAIO_Z;

  const insideInteractX = (p.x >= cubeInteractMinX && p.x <= cubeInteractMaxX);
  const insideInteractZ = (p.z >= cubeInteractMinZ && p.z <= cubeInteractMaxZ);

  // Só aplicar confinamento se o personagem estiver dentro da região de interação
  if (insideInteractX && insideInteractZ) {
    // Limites efetivos considerando a "meia-extensão" física dos pés
    const l = AREA_CUBO.minX + RAIO_X;
    const r = AREA_CUBO.maxX - RAIO_X;
    const t = AREA_CUBO.minZ + RAIO_Z;
    const b = AREA_CUBO.maxZ - RAIO_Z;

    // Se o cubo for menor que a "caixa" física do personagem em algum eixo,
    // ajustamos os limites para evitar inversões (defensivo).
    const safeL = Math.min(l, r);
    const safeR = Math.max(l, r);
    const safeT = Math.min(t, b);
    const safeB = Math.max(t, b);

    // Detecta penetração nas bordas do cubo
    const penLeft = p.x - safeL;
    const penRight = safeR - p.x;
    const penTop = p.z - safeT;
    const penBottom = safeB - p.z;

    // Se estiver estritamente dentro dos limites seguros, nada a fazer
    if (!(p.x >= safeL && p.x <= safeR && p.z >= safeT && p.z <= safeB)) {
      // Calcula penetrações positivas (quanto falta para estar dentro)
      const px = Math.min(
        penLeft > 0 ? penLeft : Infinity,
        penRight > 0 ? penRight : Infinity
      );
      const pz = Math.min(
        penTop > 0 ? penTop : Infinity,
        penBottom > 0 ? penBottom : Infinity
      );

      // Se ambos são Infinity, significa que estamos fora por ambos os lados;
      // nesse caso, escolhemos o eixo com menor distância até o interior.
      if (!isFinite(px) && !isFinite(pz)) {
        // Distâncias absolutas até as quatro bordas
        const dl = Math.abs(p.x - safeL);
        const dr = Math.abs(p.x - safeR);
        const dt = Math.abs(p.z - safeT);
        const db = Math.abs(p.z - safeB);
        const minDist = Math.min(dl, dr, dt, db);

        if (minDist === dl) { p.x = safeL; p.vx = 0; }
        else if (minDist === dr) { p.x = safeR; p.vx = 0; }
        else if (minDist === dt) { p.z = safeT; p.vz = 0; }
        else { p.z = safeB; p.vz = 0; }
      } else {
        // Substitui Infinity por um valor grande para comparação
        const compPx = isFinite(px) ? px : Number.MAX_VALUE;
        const compPz = isFinite(pz) ? pz : Number.MAX_VALUE;

        if (compPx < compPz) {
          // Corrige em X: decide se empurra para a esquerda ou direita
          p.x = (p.x < (safeL + safeR) / 2) ? safeL : safeR;
          p.vx = 0;
        } else {
          // Corrige em Z: decide se empurra para o topo ou base
          p.z = (p.z < (safeT + safeB) / 2) ? safeT : safeB;
          p.vz = 0;
        }
      }

      // Garante z dentro dos limites globais após correção
      p.z = Math.max(Z_MIN, Math.min(Z_MAX, p.z));
    }
  }

  // Nota: não aplicamos um clamp incondicional aqui; o confinamento do cubo
  // é tratado como uma colisão lógica que só age quando o personagem está
  // interagindo com a região do cubo. Isso preserva o comportamento das
  // colisões existentes e integra o cubo ao fluxo de resolução de colisões.
}