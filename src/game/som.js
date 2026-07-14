// ============================================================
// PROJETO ARMOR · SOM (bip de feedback via Web Audio)
// Sintetizado na hora (sem arquivo de áudio) — leve e sem depender de rede.
// Volume proporcional à preferência "Volume dos efeitos" (Configurações).
// ============================================================

let ac = null;

// Toca um bip curto (seno) com o volume/tom pedidos. `vol` é 0..100 (mesma
// escala da preferência volumeEfeitos); `freq` em Hz.
export function tocarBip(vol = 85, freq = 620) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ac) ac = new AC();
    if (ac.state === 'suspended') ac.resume();
    const g = ac.createGain();
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const alvo = Math.max(0.0002, Math.min(1, vol / 100) * 0.16);
    const t = ac.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(alvo, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t);
    o.stop(t + 0.14);
  } catch {}
}
