// ============================================================
// CENÁRIO · ESCUDO DO PERSONAGEM
// Uma "bolha" holográfica (mesma estética do cubo do hangar) que envolve o
// personagem e o acompanha para onde ele for — como se ele andasse DENTRO do
// escudo azul. Três passes, encaixados no desenho do personagem (render.js):
//
//   1. escudoAtras   — metade de trás da bolha (desenha ANTES do sprite)
//   2. escudoTextura — a "textura do escudo" aplicada sobre a SILHUETA do
//                      personagem (brilho/varredura azul seguindo o corpo)
//   3. escudoFrente  — metade da frente + aro + faíscas (desenha SOBRE o sprite)
//
// A cor vem do grupo `escudo` em luzes.js, então os presets (alerta = vermelho,
// futurista = azul…) também recolorem o escudo. Intensidade 0 = escudo some.
// ============================================================
import { LUZ, corFinal, intensidadeAgora } from './luzes';

// Canvas de apoio para carimbar a textura na silhueta (reaproveitado)
let tmp = null;
const hex2rgb = (h) => {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};

// Geometria da bolha a partir do corpo (cx = centro X, base = pés, alt = altura)
function geometria(cx, base, alt) {
  const halfW = alt * 0.36;
  const topo = base - alt * 1.08;
  const fundo = base + alt * 0.05;
  const capa = halfW * 0.34;      // raio vertical das "tampas" (elipses topo/base)
  return { cx, halfW, topo, fundo, capa, alt };
}

// Caminho da cápsula (cilindro de energia) — lados retos + topo/base curvos
function caminhoCapsula(ctx, g) {
  const { cx, halfW, topo, fundo, capa } = g;
  ctx.beginPath();
  ctx.moveTo(cx - halfW, topo);
  ctx.bezierCurveTo(cx - halfW, topo - capa, cx + halfW, topo - capa, cx + halfW, topo);
  ctx.lineTo(cx + halfW, fundo);
  ctx.bezierCurveTo(cx + halfW, fundo + capa, cx - halfW, fundo + capa, cx - halfW, fundo);
  ctx.closePath();
}

function estado(t) {
  const g = LUZ.grupos.escudo;
  if (!g) return null;
  const alfa = intensidadeAgora(g, t, 3.1);
  if (alfa <= 0.01) return null;
  const [r, gg, b] = hex2rgb((g.cor || '#6fd4ff'));
  return { alfa, cor: corFinal(g), rgb: [r, gg, b] };
}

// ---------- 1) METADE DE TRÁS (antes do sprite) ----------
export function escudoAtras(ctx, cx, base, alt, t) {
  const s = estado(t);
  if (!s) return;
  const g = geometria(cx, base, alt);
  const { rgb, alfa } = s;
  const rgba = (a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  ctx.save();
  // preenchimento translúcido (o personagem aparece através dele)
  caminhoCapsula(ctx, g);
  const fill = ctx.createLinearGradient(g.cx - g.halfW, 0, g.cx + g.halfW, 0);
  fill.addColorStop(0, rgba(0.20 * alfa));
  fill.addColorStop(0.5, rgba(0.05 * alfa));
  fill.addColorStop(1, rgba(0.20 * alfa));
  ctx.fillStyle = fill;
  ctx.fill();
  // arco de trás da tampa inferior (dá volume de cilindro)
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(0.35 * alfa);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(g.cx, g.fundo, g.halfW, g.capa, 0, Math.PI, 0);
  ctx.stroke();
  ctx.restore();
}

// ---------- 2) TEXTURA sobre a silhueta do personagem ----------
// info: { sprite, sx, sy, sw, sh, ax, ay, flip, dW, dH, dOffX, dGap }
export function escudoTextura(ctx, info, t) {
  const s = estado(t);
  if (!s) return;
  const { rgb, alfa } = s;
  const { sprite, sx, sy, sw, sh, ax, ay, flip, dW, dH, dOffX, dGap } = info;
  if (dW <= 0 || dH <= 0) return;
  if (!tmp) tmp = document.createElement('canvas');
  if (tmp.width < dW) tmp.width = dW;
  if (tmp.height < dH) tmp.height = dH;
  const tc = tmp.getContext('2d');
  tc.setTransform(1, 0, 0, 1, 0, 0);
  tc.clearRect(0, 0, dW, dH);
  tc.imageSmoothingEnabled = false;
  // silhueta do personagem no quadro atual
  tc.globalCompositeOperation = 'source-over';
  tc.drawImage(sprite, sx, sy, sw, sh, 0, 0, dW, dH);
  // colore só onde há corpo (source-in) → silhueta azul
  tc.globalCompositeOperation = 'source-in';
  tc.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  tc.fillRect(0, 0, dW, dH);
  // faixa de VARREDURA que sobe pelo corpo (só onde há corpo: source-atop)
  const sweep = (Math.sin(t * 0.05) * 0.5 + 0.5);
  const by = dH * (1 - sweep);
  const band = tc.createLinearGradient(0, by - dH * 0.22, 0, by + dH * 0.22);
  band.addColorStop(0, 'rgba(255,255,255,0)');
  band.addColorStop(0.5, 'rgba(255,255,255,0.85)');
  band.addColorStop(1, 'rgba(255,255,255,0)');
  tc.globalCompositeOperation = 'source-atop';
  tc.fillStyle = band;
  tc.fillRect(0, 0, dW, dH);
  // carimba sobre o personagem, no MESMO lugar/escala do sprite (additivo)
  ctx.save();
  ctx.setTransform(flip ? -1 : 1, 0, 0, 1, ax, ay);
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, 0.55 * alfa);
  ctx.drawImage(tmp, 0, 0, dW, dH, -Math.round(dW / 2) + dOffX, -dH + dGap, dW, dH);
  ctx.restore();
}

// ---------- 3) METADE DA FRENTE (sobre o sprite) ----------
export function escudoFrente(ctx, cx, base, alt, t) {
  const s = estado(t);
  if (!s) return;
  const g = geometria(cx, base, alt);
  const { rgb, alfa } = s;
  const rgba = (a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // contorno luminoso da cápsula
  caminhoCapsula(ctx, g);
  ctx.strokeStyle = rgba(0.7 * alfa);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = rgba(0.22 * alfa);
  ctx.lineWidth = 3.2;
  ctx.stroke();
  // tampa superior (elipse cheia à frente)
  ctx.beginPath();
  ctx.ellipse(g.cx, g.topo, g.halfW, g.capa, 0, 0, Math.PI * 2);
  ctx.strokeStyle = rgba(0.55 * alfa);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // linha de varredura horizontal subindo dentro da cápsula
  const sweep = (Math.sin(t * 0.05) * 0.5 + 0.5);
  const sy = g.fundo - (g.fundo - g.topo) * sweep;
  ctx.save();
  caminhoCapsula(ctx, g);
  ctx.clip();
  const lin = ctx.createLinearGradient(0, sy - 5, 0, sy + 5);
  lin.addColorStop(0, rgba(0)); lin.addColorStop(0.5, rgba(0.5 * alfa)); lin.addColorStop(1, rgba(0));
  ctx.fillStyle = lin;
  ctx.fillRect(g.cx - g.halfW, sy - 6, g.halfW * 2, 12);
  ctx.restore();
  // faíscas internas (pontos que sobem devagar)
  for (let i = 0; i < 7; i++) {
    const ph = (t * 0.01 + i * 0.37) % 1;
    const py = g.fundo - (g.fundo - g.topo) * ph;
    const px = g.cx + Math.sin(i * 2.1 + t * 0.02) * g.halfW * 0.6;
    const rr = i % 3 === 0 ? 1.6 : 1;
    ctx.fillStyle = rgba((0.5 + 0.5 * Math.sin(t * 0.08 + i)) * 0.8 * alfa);
    ctx.beginPath(); ctx.arc(px, py, rr, 0, 7); ctx.fill();
  }
  // aro de base no chão (brilho onde a bolha toca o piso)
  const aro = ctx.createRadialGradient(g.cx, g.fundo, 1, g.cx, g.fundo, g.halfW * 1.4);
  aro.addColorStop(0, rgba(0.5 * alfa)); aro.addColorStop(1, rgba(0));
  ctx.fillStyle = aro;
  ctx.beginPath();
  ctx.ellipse(g.cx, g.fundo, g.halfW * 1.4, g.capa * 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
