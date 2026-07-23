// ============================================================
// WONDERBOUND · MUNDO (matemática pura do céu, sol/lua e pulo)
// Funções SEM estado e SEM desenho: só calculam cores, mistura, posição do
// sol pela hora/latitude e a altura do pulo roteirizado. O motor (motor.js)
// usa tudo isto na hora de pintar a cena.
// ============================================================
import { JUMP_LAUNCH_F, JUMP_LAND_F, JUMP_ARC_H } from './sprites';

// Interpola dois RGB (arrays [r,g,b]) por t (0..1).
export const lerpArr = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const rgbStr = (a) => `rgb(${Math.round(a[0])},${Math.round(a[1])},${Math.round(a[2])})`;
export const rgbaStr = (a, al) => `rgba(${Math.round(a[0])},${Math.round(a[1])},${Math.round(a[2])},${al})`;
// Suavização (smoothstep) entre a e b.
export const suave = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Altura do pulo roteirizado em função do frame da animação: meia onda de seno
// entre o frame de impulso e o de aterrissagem (0 antes/depois → pés no chão).
export const jumpArc = (f) => {
  if (f <= JUMP_LAUNCH_F || f >= JUMP_LAND_F) return 0;
  const t = (f - JUMP_LAUNCH_F) / (JUMP_LAND_F - JUMP_LAUNCH_F);
  return JUMP_ARC_H * Math.sin(Math.PI * t);
};

// Horário do nascer/pôr do sol para a latitude e a data dadas.
export function calcularSol(lat, date) {
  const inicio = new Date(date.getFullYear(), 0, 0);
  const N = Math.floor((date - inicio) / 86400000);
  const decl = 23.45 * Math.sin((2 * Math.PI / 365) * (284 + N));
  const latR = lat * Math.PI / 180, declR = decl * Math.PI / 180;
  let cosH = -Math.tan(latR) * Math.tan(declR);
  cosH = Math.max(-1, Math.min(1, cosH));
  const H = Math.acos(cosH) * 180 / Math.PI;
  const meio = H / 15;
  return { sr: 12 - meio, ss: 12 + meio };
}

// Luminosidade (lum) e "twilight" (twi) do céu para a hora h, dados o nascer
// (sr) e o pôr (ss) do sol.
export function faseDia(h, sr, ss) {
  const tw = 0.8; let lum;
  if (h <= sr - tw || h >= ss + tw) lum = 0;
  else if (h < sr + tw) lum = suave(sr - tw, sr + tw, h);
  else if (h <= ss - tw) lum = 1;
  else lum = 1 - suave(ss - tw, ss + tw, h);
  return { lum, twi: Math.max(0, 1 - Math.abs(lum - 0.5) * 2) };
}
