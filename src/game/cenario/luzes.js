// ============================================================
// CENÁRIO · LUZES DINÂMICAS
// Nenhuma luz do cenário está "assada" na arte: cada grupo abaixo controla,
// EM TEMPO REAL, um conjunto de sprites emissivos (ver mapa.js → luzes).
// Mude cor / saturação / intensidade / brilho / opacidade sem redesenhar nada:
//
//   import { definirLuz, aplicarPreset } from './cenario/luzes';
//   definirLuz('cubo', { cor: '#ff4a4a', intensidade: 1.2 });
//   aplicarPreset('alerta');
//
// No jogo rodando também dá pelo console: window.ARMOR_CENARIO.aplicarPreset('noturno')
// ============================================================

// Estado vivo das luzes (mutável em tempo real)
export const LUZ = {
  // Luz ambiente: véu escuro sobre a cena toda. `seguirRelogio: true` deixa o
  // relógio do jogo (dia/noite real) clarear/escurecer o hangar pelas janelas.
  ambiente: { cor: '#0b1220', opacidade: 0.34, seguirRelogio: true },
  grupos: {
    cubo:       { cor: '#5ec8ff', saturacao: 1, brilho: 1, intensidade: 1.0, opacidade: 1, pulso: 0.10 },
    plataforma: { cor: '#3ae0d6', saturacao: 1, brilho: 1, intensidade: 1.0, opacidade: 1, pulso: 0.05 },
    linhaPiso:  { cor: '#2ed8c6', saturacao: 1, brilho: 1, intensidade: 0.9, opacidade: 1, pulso: 0 },
    reflexo:    { cor: '#3ecce8', saturacao: 1, brilho: 1, intensidade: 0.6, opacidade: 1, pulso: 0.08 },
    lampadas:   { cor: '#ffb44d', saturacao: 1, brilho: 1, intensidade: 0.95, opacidade: 1, pulso: 0.03 },
    // `seguirCeu: true` = a cor dos vidros acompanha a fase do dia (relógio)
    janelas:    { cor: '#aac4e6', saturacao: 1, brilho: 1, intensidade: 0.85, opacidade: 1, pulso: 0, seguirCeu: true },
    // Escudo holográfico que envolve o personagem (ver cenario/escudo.js).
    // intensidade 0 = escudo invisível.
    escudo:     { cor: '#6fd4ff', saturacao: 1, brilho: 1, intensidade: 1.0, opacidade: 1, pulso: 0.16 },
  },
};

// Cópia profunda do estado "de fábrica" (para o preset padrão restaurar)
const FABRICA = JSON.parse(JSON.stringify(LUZ));

// Altera um grupo em tempo real. Ex.: definirLuz('lampadas', { intensidade: 0 })
export function definirLuz(grupo, props) {
  const alvo = grupo === 'ambiente' ? LUZ.ambiente : LUZ.grupos[grupo];
  if (alvo) Object.assign(alvo, props);
}

// ---- PRESETS de ambiente (aplicáveis em tempo real) ----
export const PRESETS = {
  // volta tudo ao padrão de fábrica
  padrao: FABRICA,
  claro: {
    ambiente: { cor: '#0b1220', opacidade: 0.08, seguirRelogio: false },
    grupos: { lampadas: { intensidade: 1.1 }, janelas: { intensidade: 1.0, seguirCeu: false, cor: '#dfe9f5' } },
  },
  escuro: {
    ambiente: { cor: '#05080f', opacidade: 0.55, seguirRelogio: false },
    grupos: { lampadas: { intensidade: 0.75 } },
  },
  noturno: {
    ambiente: { cor: '#040817', opacidade: 0.62, seguirRelogio: false },
    grupos: {
      janelas: { cor: '#16264a', intensidade: 0.5, seguirCeu: false },
      lampadas: { intensidade: 0.65 },
      cubo: { intensidade: 1.15 },
    },
  },
  alerta: {
    ambiente: { cor: '#1d0407', opacidade: 0.45, seguirRelogio: false },
    grupos: {
      cubo: { cor: '#ff4a4a', pulso: 0.5, intensidade: 1.1 },
      plataforma: { cor: '#ff5a4a', pulso: 0.5 },
      linhaPiso: { cor: '#ff4a3a', pulso: 0.5 },
      reflexo: { cor: '#ff5a4a', pulso: 0.5 },
      lampadas: { cor: '#ff7a4a', intensidade: 0.8 },
      janelas: { cor: '#3a1020', seguirCeu: false, intensidade: 0.5 },
      escudo: { cor: '#ff4a4a', pulso: 0.5 },
    },
  },
  futurista: {
    ambiente: { cor: '#060b22', opacidade: 0.4, seguirRelogio: false },
    grupos: {
      cubo: { cor: '#4a9fff', intensidade: 1.15 },
      plataforma: { cor: '#4a7fff' },
      linhaPiso: { cor: '#4a8fff' },
      reflexo: { cor: '#4a8fff' },
      lampadas: { cor: '#7ab4ff' },
      janelas: { cor: '#7a9fdf', seguirCeu: false },
      escudo: { cor: '#4a9fff' },
    },
  },
};

export function aplicarPreset(nome) {
  const p = PRESETS[nome];
  if (!p) return false;
  // padrão restaura tudo; os demais partem do padrão e aplicam as diferenças
  const base = JSON.parse(JSON.stringify(FABRICA));
  Object.assign(LUZ.ambiente, base.ambiente, p.ambiente || {});
  for (const g of Object.keys(LUZ.grupos)) {
    Object.assign(LUZ.grupos[g], base.grupos[g], (p.grupos && p.grupos[g]) || {});
  }
  return true;
}

// ---- Cor final de um grupo (aplica saturação/brilho sobre a cor base) ----
const hex2rgb = (hex) => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

export function corFinal(g) {
  let [r, gg, b] = hex2rgb(g.cor || '#ffffff');
  const sat = g.saturacao ?? 1, bri = g.brilho ?? 1;
  if (sat !== 1) {
    const cinza = 0.299 * r + 0.587 * gg + 0.114 * b;
    r = cinza + (r - cinza) * sat; gg = cinza + (gg - cinza) * sat; b = cinza + (b - cinza) * sat;
  }
  r = Math.min(255, r * bri); gg = Math.min(255, gg * bri); b = Math.min(255, b * bri);
  return `rgb(${r | 0},${gg | 0},${b | 0})`;
}

// Intensidade do momento (aplica a pulsação, se o grupo tiver)
export function intensidadeAgora(g, t, fase = 0) {
  const puls = g.pulso || 0;
  const onda = puls ? 1 - puls + puls * (0.5 + 0.5 * Math.sin(t * 0.06 + fase)) : 1;
  return Math.max(0, (g.intensidade ?? 1) * (g.opacidade ?? 1) * onda);
}
