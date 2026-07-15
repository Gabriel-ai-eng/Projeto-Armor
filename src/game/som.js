// ============================================================
// PROJETO ARMOR · SOM (bip de feedback + passos, via Web Audio)
// O bip é sintetizado na hora (sem arquivo). Os passos usam uma gravação
// curta (assets/armor-passos.mp3 — mp3 por compatibilidade: o m4a/aac
// original não decodifica em todo navegador via Web Audio) recortada pra dar
// loop contínuo sem costura enquanto o personagem anda/corre.
// Volume proporcional à preferência "Volume dos efeitos" (Configurações).
// ============================================================
import { asset } from './sprites';

let ac = null;
const getAC = () => {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ac) ac = new AC();
  if (ac.state === 'suspended') ac.resume();
  return ac;
};

// Toca um bip curto (seno) com o volume/tom pedidos. `vol` é 0..100 (mesma
// escala da preferência volumeEfeitos); `freq` em Hz.
export function tocarBip(vol = 85, freq = 620) {
  try {
    const ctx = getAC();
    if (!ctx) return;
    const g = ctx.createGain();
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const alvo = Math.max(0.0002, Math.min(1, vol / 100) * 0.16);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(alvo, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.14);
  } catch {}
}

// ---- PASSOS (loop enquanto anda/corre) --------------------------------
// Recorte de ~2,34s escolhido pra bater exatamente com o intervalo entre as
// passadas da gravação original — no loop, o "passo" seguinte cai no mesmo
// ritmo dos outros, sem parecer um corte.
let passosBuffer = null;
let passosCarregando = null;
let passosNode = null;  // AudioBufferSourceNode ativo (null = parado)
let passosGain = null;

async function carregarPassos(ctx) {
  if (passosBuffer) return passosBuffer;
  if (!passosCarregando) {
    passosCarregando = fetch(asset('armor-passos.mp3'))
      .then((r) => r.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((decoded) => { passosBuffer = decoded; return decoded; })
      .catch(() => null);
  }
  return passosCarregando;
}

// Volume bem mais discreto que o bip (0..100 igual à preferência, mas
// escalado bem pra baixo): passo repete o tempo todo enquanto anda, então
// precisa ficar de fundo, não competir com os efeitos "de destaque".
const VOL_PASSOS_MUL = 0.22;

// Chamar a cada quadro com `andando = true` enquanto o personagem estiver
// de fato se deslocando (andar/correr); a função cuida de iniciar o loop na
// primeira vez e ajustar o volume. Chamar com `andando = false` (ou parar de
// chamar) quando ele parar — o loop pausa sozinho.
export function passosSetAtivo(andando, vol = 85) {
  try {
    const ctx = getAC();
    if (!ctx) return;

    if (!andando) {
      if (passosNode) {
        try { passosNode.stop(); } catch {}
        passosNode.disconnect();
        passosNode = null;
      }
      return;
    }

    if (passosGain) {
      const alvo = Math.max(0, Math.min(1, vol / 100)) * VOL_PASSOS_MUL;
      passosGain.gain.setTargetAtTime(alvo, ctx.currentTime, 0.05);
    }

    if (passosNode) return; // já tocando

    carregarPassos(ctx).then((buffer) => {
      if (!buffer || passosNode) return; // chegou tarde ou já parou/reiniciou
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const g = ctx.createGain();
      const alvo = Math.max(0, Math.min(1, vol / 100)) * VOL_PASSOS_MUL;
      g.gain.setValueAtTime(alvo, ctx.currentTime);
      src.connect(g);
      g.connect(ctx.destination);
      src.start(0);
      passosNode = src;
      passosGain = g;
    });
  } catch {}
}
