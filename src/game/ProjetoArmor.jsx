import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ============================================================
// PROJETO ARMOR — Capítulo 1: O Despertar
// HUD dupla: joystick mover (esq) + mirar (dir) · tiro · míssil · voar
// ============================================================

// ?v=N força o navegador/CDN a baixar a imagem nova quando ela muda (cache-busting).
// Incremente o número sempre que trocar o conteúdo de armor-andar.png.
const SPRITE_ANDAR = '/armor-andar.png?v=3';
const SPRITE_CORRER = 'https://i.ibb.co/tTxmyXws/titan-correr-tira.png';
// Pulo: folha em GRADE (10 colunas x 17 linhas = 170 frames), lida em zigue-zague
// esquerda→direita, de cima→baixo. O ciclo completo: agacha (anticipação) →
// impulso a jato → voo → aterrissagem com poeira → recupera e fica de pé.
const SPRITE_PULAR = '/armor-pular.png?v=1';
const IMG_CHAO = 'https://i.ibb.co/KzVkz7dS/11-20260612-202236-0000.png';

const SPRITE_OLHA_PARA = 'direita';

// ---------- Ajustes finos ----------
const ALT = 360;
const RENDER_SCALE = 2;
const WORLD_W = 1700;
const ALTURA_ARMOR = 105;
const ZOOM_PERTO = 1.7;
const ALTURA_IMG_CHAO = 230;
const LINHA_PES = 0.18;

const FRAMES_ANDAR = 39;   // frame 0 = parado; frames 1..38 = ciclo de caminhada (da folha, em ordem)
const FRAMES_CORRER = 15;
const FRAME_PARADO = 0;

const VEL_ANDAR = 3.4;
const VEL_CORRER = 6.4;
const LIMIAR_CORRER = 0.75;

// física vertical (pulo / voo)
const GRAV = 0.5, JUMP_V = 10, FLY_THRUST = 0.92, VY_MAX = 4.4, VY_FALL = 11, ALT_MAX = 210;

// ---------- Pulo roteirizado (folha em grade) ----------
const PULAR_COLS = 10, PULAR_ROWS = 17, PULAR_FRAMES = 170;
const PULAR_BODY_R = 0.797;   // altura do corpo ÷ altura da célula (frame em pé) → escala fixa
const PULAR_FOOT_R = 0.12;    // distância dos pés até a base da célula (frames no chão) → planta os pés no solo
const JUMP_ANIM_SPEED = 1.6;  // frames de sprite por tick (~1.8 s para os 170 frames)
const JUMP_LAUNCH_F = 30;     // frame em que sai do chão (fim da anticipação)
const JUMP_LAND_F = 129;      // frame em que aterrissa (impacto/poeira)
const JUMP_ARC_H = 100;       // altura do arco do pulo (px) — casada com o pulo físico antigo
// armas
const COOLDOWN_TIRO = 8, COOLDOWN_MISSIL = 26, VEL_TIRO = 15, VEL_MISSIL = 8.5;

const AZUL = '#6ED8FF', OURO = '#F0C040';
const AZUL_RGB = [110, 216, 255], OURO_RGB = [240, 192, 64], FLY_RGB = [175, 228, 255];

// ---------- Cores do céu por fase do dia ----------
const NOITE = [[7, 10, 22], [16, 26, 51], [28, 42, 71]];
const DIA   = [[44, 111, 178], [92, 159, 214], [166, 203, 232]];
const CREP  = [[36, 27, 58], [122, 63, 102], [224, 137, 79]];

const lerpArr = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgbStr = (a) => `rgb(${Math.round(a[0])},${Math.round(a[1])},${Math.round(a[2])})`;
const rgbaStr = (a, al) => `rgba(${Math.round(a[0])},${Math.round(a[1])},${Math.round(a[2])},${al})`;
const suave = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const dist2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

// Altura do pulo roteirizado em função do frame da animação: meia onda de seno
// entre o frame de impulso e o de aterrissagem (0 antes/depois → pés no chão).
const jumpArc = (f) => {
  if (f <= JUMP_LAUNCH_F || f >= JUMP_LAND_F) return 0;
  const t = (f - JUMP_LAUNCH_F) / (JUMP_LAND_F - JUMP_LAUNCH_F);
  return JUMP_ARC_H * Math.sin(Math.PI * t);
};

function calcularSol(lat, date) {
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
function faseDia(h, sr, ss) {
  const tw = 0.8; let lum;
  if (h <= sr - tw || h >= ss + tw) lum = 0;
  else if (h < sr + tw) lum = suave(sr - tw, sr + tw, h);
  else if (h <= ss - tw) lum = 1;
  else lum = 1 - suave(ss - tw, ss + tw, h);
  return { lum, twi: Math.max(0, 1 - Math.abs(lum - 0.5) * 2) };
}

// posições da HUD (dependem da largura visível VW)
function calcHUD(VW) {
  const R = 38, m = 24;
  return {
    R,
    moverBase: { x: m + R + 6, y: ALT - m - R },
    mirarBase: { x: VW - (m + R + 6), y: ALT - m - R },
    botoes: [
      { id: 'tiro',   x: VW - 172, y: ALT - 92,  r: 24, cor: AZUL_RGB },
      { id: 'missil', x: VW - 150, y: ALT - 148, r: 20, cor: OURO_RGB },
      { id: 'voar',   x: VW - 96,  y: ALT - 162, r: 22, cor: FLY_RGB },
    ],
  };
}

// Botões "Jogar" e "Sair" desenhados sobre o vídeo da tela inicial: invisíveis
// em repouso, saltam (~1,3x) e acendem ao serem pressionados. Posições/tamanhos
// em % do vídeo, iguais à tela inicial original.
const BOTOES_INICIO = [
  { id: 'jogar', src: '/btn-jogar.png', cx: 13.26, cy: 37.82, w: 20.4, aspect: 4.07 },
  { id: 'sair',  src: '/btn-sair.png',  cx: 12.98, cy: 91.18, w: 17.1, aspect: 4.84 },
];

const IconeRelogio = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  </svg>
);

export default function ProjetoArmor({ onVoltar }) {
  const [fase, setFase] = useState('carregando');
  const [zoomPerto, setZoomPerto] = useState(false);
  const [relogioAtivo, setRelogioAtivo] = useState(false);
  const [horaTexto, setHoraTexto] = useState('--:--');
  const [botaoPressionado, setBotaoPressionado] = useState(null); // 'jogar' | 'sair' | null
  const [paisagem, setPaisagem] = useState(
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : true
  );

  const canvasRef = useRef(null);
  const G = useRef(null);
  const zoomAlvoRef = useRef(1);
  const relogioAtivoRef = useRef(false);
  const solRef = useRef({ sr: 6.5, ss: 18.5 });
  const latRef = useRef(null);
  const imgsRef = useRef({ andar: null, correr: null, chao: null, pular: null, calibAndar: null, calibCorrer: null, chaoCalib: null });
  const videoIntroRef = useRef(null);
  const introTocadaRef = useRef(false); // true depois que a intro tocou uma vez

  // ---------- CARREGAMENTO + AUTOCALIBRAÇÃO ----------
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    let vivos = true;
    const carregar = (src, cors) =>
      new Promise((res, rej) => {
        const img = new Image();
        if (cors) img.crossOrigin = 'anonymous';
        img.onload = () => res(img); img.onerror = rej; img.src = src;
      });

    const calibrar = (img, nFrames) => {
      try {
        const CW = 200 * nFrames, CH = Math.max(1, Math.round(img.height * (CW / img.width)));
        const c = document.createElement('canvas'); c.width = CW; c.height = CH;
        const cx = c.getContext('2d'); cx.drawImage(img, 0, 0, CW, CH);
        const fw = CW / nFrames; const frames = []; let maiorCorpo = 0;
        for (let f = 0; f < nFrames; f++) {
          const x0 = Math.round(f * fw), W = Math.round(fw);
          const data = cx.getImageData(x0, 0, W, CH).data;
          let top = CH, bot = -1, esq = W, dir = -1;
          for (let y = 0; y < CH; y++) for (let x = 0; x < W; x++)
            if (data[(y * W + x) * 4 + 3] > 12) {
              if (y < top) top = y; if (y > bot) bot = y;
              if (x < esq) esq = x; if (x > dir) dir = x;
            }
          if (bot < 0) { frames.push(null); continue; }
          const corpo = bot - top + 1; if (corpo > maiorCorpo) maiorCorpo = corpo;
          frames.push({ botR: bot / CH, cxR: (esq + dir) / 2 / W });
        }
        const valido = frames.find(f => f !== null);
        if (!valido || maiorCorpo === 0) return null;
        for (let f = 0; f < nFrames; f++) if (!frames[f]) frames[f] = valido;
        return { frames, corpoR: maiorCorpo / CH };
      } catch (e) { return null; }
    };

    const calibrarChao = (img) => {
      try {
        const CW = 400, CH = Math.max(1, Math.round(img.height * (CW / img.width)));
        const c = document.createElement('canvas'); c.width = CW; c.height = CH;
        const cx = c.getContext('2d'); cx.drawImage(img, 0, 0, CW, CH);
        const data = cx.getImageData(0, 0, CW, CH).data;
        let topRow = -1, botRow = -1;
        for (let y = 0; y < CH && topRow < 0; y++) for (let x = 0; x < CW; x += 2)
          if (data[(y * CW + x) * 4 + 3] > 12) { topRow = y; break; }
        for (let y = CH - 1; y >= 0 && botRow < 0; y--) for (let x = 0; x < CW; x += 2)
          if (data[(y * CW + x) * 4 + 3] > 12) { botRow = y; break; }
        if (topRow < 0) return null;
        const sy = Math.max(0, botRow - 2), si = (sy * CW + Math.floor(CW / 2)) * 4;
        return { topR: topRow / CH, botR: (botRow + 1) / CH, cor: `rgb(${data[si]},${data[si + 1]},${data[si + 2]})` };
      } catch (e) { return null; }
    };

    const carregarSprite = async (src, medir) => {
      try { const img = await carregar(src, true); return { img, leitura: medir(img) }; }
      catch (e) { const img = await carregar(src, false); return { img, leitura: null }; }
    };

    Promise.all([
      carregarSprite(SPRITE_ANDAR, (im) => calibrar(im, FRAMES_ANDAR)),
      carregarSprite(SPRITE_CORRER, (im) => calibrar(im, FRAMES_CORRER)),
      carregarSprite(IMG_CHAO, calibrarChao),
      carregarSprite(SPRITE_PULAR, () => null),   // grade fixa: não precisa de autocalibração
    ]).then(([a, r, solo, pl]) => {
      if (!vivos) return;
      imgsRef.current = {
        andar: a.img, calibAndar: a.leitura, correr: r.img, calibCorrer: r.leitura,
        chao: solo.img, chaoCalib: solo.leitura, pular: pl.img,
      };
      setFase('pronto');
    }).catch(() => vivos && setFase('erro'));

    return () => {
      vivos = false; document.body.style.overflow = 'auto';
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      try { window.screen.orientation.unlock(); } catch (e) {}
    };
  }, []);

  // ---------- ORIENTAÇÃO + CANVAS 2x ----------
  useEffect(() => {
    // O matchMedia reflete a orientação real no exato instante da virada; o
    // window.innerWidth costuma ficar defasado durante a rotação, o que atrasava
    // a troca para a tela do vídeo. Por isso a orientação passa a ser decidida
    // pelo matchMedia (com fallback para as dimensões da janela).
    const mqLandscape = window.matchMedia('(orientation: landscape)');
    const redimensionar = () => {
      const ww = window.innerWidth, wh = window.innerHeight;
      const landscape = mqLandscape.matches || ww > wh;
      setPaisagem(landscape);
      // Ao virar para horizontal, tenta entrar em tela cheia automaticamente.
      // Obs.: a maioria dos navegadores só permite tela cheia a partir de um
      // gesto do usuário; quando a rotação não conta como gesto, isto falha em
      // silêncio e o toque na tela (entrarTelaCheia) continua valendo.
      if (landscape && !document.fullscreenElement) {
        try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch (e) {}
        try { window.screen.orientation.lock('landscape').catch(() => {}); } catch (e) {}
      }
      const c = canvasRef.current;
      if (c) { c.height = ALT * RENDER_SCALE; c.width = Math.max(480, Math.round(ALT * ww / wh)) * RENDER_SCALE; }
    };
    redimensionar();
    window.addEventListener('resize', redimensionar);
    window.addEventListener('orientationchange', redimensionar);
    // Estes disparam no momento exato da virada → vídeo aparece instantâneo.
    if (mqLandscape.addEventListener) mqLandscape.addEventListener('change', redimensionar);
    else if (mqLandscape.addListener) mqLandscape.addListener(redimensionar);
    try { window.screen.orientation.addEventListener('change', redimensionar); } catch (e) {}
    return () => {
      window.removeEventListener('resize', redimensionar);
      window.removeEventListener('orientationchange', redimensionar);
      if (mqLandscape.removeEventListener) mqLandscape.removeEventListener('change', redimensionar);
      else if (mqLandscape.removeListener) mqLandscape.removeListener(redimensionar);
      try { window.screen.orientation.removeEventListener('change', redimensionar); } catch (e) {}
    };
  }, []);

  // ---------- RELÓGIO EM TEMPO REAL ----------
  useEffect(() => {
    if (!relogioAtivo) return;
    const atualizar = () => {
      const now = new Date();
      setHoraTexto(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      const lat = latRef.current;
      solRef.current = (lat != null) ? calcularSol(lat, now) : { sr: 6.5, ss: 18.5 };
    };
    atualizar();
    const id = setInterval(atualizar, 1000);
    return () => clearInterval(id);
  }, [relogioAtivo]);

  const initGame = () => {
    G.current = {
      p: { x: 260, y: 0, vx: 0, vy: 0, face: 1, animT: 0, modo: 'parado' },
      fx: 260, fy: -(ALT * 0.22), zoom: zoomAlvoRef.current,
      t: 0, toques: {},
      flying: false, lastFlyDown: 0, jump: null,
      tiroHeld: false, tiroCd: 0, missilQueued: false, missilCd: 0,
      projeteis: [], particulas: [],
    };
  };

  // ---------- LOOP PRINCIPAL ----------
  useEffect(() => {
    if (fase !== 'jogando') return;
    initGame();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const mapa = (cx, cy) => {
      const r = canvas.getBoundingClientRect(); const s = r.height / ALT;
      return { x: (cx - r.left) / s, y: (cy - r.top) / s };
    };

    // ---- botão de voar: 1 toque = pulo · 2 toques + segurar = voar ----
    const voarDown = () => {
      const g = G.current, now = performance.now();
      if (now - g.lastFlyDown < 320) { g.flying = true; g.jump = null; }  // 2º toque rápido → voa (cancela o pulo)
      else if (g.p.y <= 2 && !g.jump) g.jump = { f: 0 };                  // toque único no chão → anima o pulo
      g.lastFlyDown = now;
    };
    const voarUp = () => { G.current.flying = false; };        // soltar → cai

    const onTS = (e) => {
      e.preventDefault();
      const g = G.current, VW = canvas.width / RENDER_SCALE, hud = calcHUD(VW);
      for (const t of e.changedTouches) {
        const p = mapa(t.clientX, t.clientY);
        // 1) botões (prioridade)
        let pego = false;
        for (const b of hud.botoes) {
          if (dist2(p.x, p.y, b.x, b.y) <= b.r + 8) {
            g.toques[t.identifier] = { tipo: 'btn', botao: b.id };
            if (b.id === 'tiro') g.tiroHeld = true;
            else if (b.id === 'missil') g.missilQueued = true;
            else if (b.id === 'voar') voarDown();
            pego = true; break;
          }
        }
        if (pego) continue;
        // 2) sticks flutuantes por lado
        if (p.x < VW / 2) g.toques[t.identifier] = { tipo: 'mover', bx: p.x, by: p.y, cx: p.x, cy: p.y };
        else g.toques[t.identifier] = { tipo: 'mirar', bx: p.x, by: p.y, cx: p.x, cy: p.y };
      }
    };
    const onTM = (e) => {
      e.preventDefault();
      const g = G.current;
      for (const t of e.changedTouches) {
        const tq = g.toques[t.identifier];
        if (!tq || tq.tipo === 'btn') continue;
        const p = mapa(t.clientX, t.clientY); tq.cx = p.x; tq.cy = p.y;
      }
    };
    const endTouch = (e) => {
      const g = G.current;
      for (const t of e.changedTouches) {
        const tq = g.toques[t.identifier];
        if (tq && tq.tipo === 'btn') {
          if (tq.botao === 'tiro') g.tiroHeld = false;
          else if (tq.botao === 'voar') voarUp();
        }
        delete g.toques[t.identifier];
      }
    };
    canvas.addEventListener('touchstart', onTS, { passive: false });
    canvas.addEventListener('touchmove', onTM, { passive: false });
    canvas.addEventListener('touchend', endTouch);
    canvas.addEventListener('touchcancel', endTouch);

    // ===== ÍCONES DESENHADOS À MÃO =====
    const icone = (id, cx, cy, s, cor) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = cor; ctx.fillStyle = cor;
      ctx.lineWidth = Math.max(1.6, s * 0.13);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = cor; ctx.shadowBlur = 6;
      if (id === 'tiro') {                          // mira
        ctx.beginPath(); ctx.arc(0, 0, s * 0.52, 0, 7); ctx.stroke();
        for (let k = 0; k < 4; k++) {
          const a = k * Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * s * 0.52, Math.sin(a) * s * 0.52);
          ctx.lineTo(Math.cos(a) * s * 0.92, Math.sin(a) * s * 0.92);
          ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0, 0, s * 0.12, 0, 7); ctx.fill();
      } else if (id === 'missil') {                 // foguete
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.85);                   // nariz
        ctx.lineTo(s * 0.28, -s * 0.2);
        ctx.lineTo(s * 0.28, s * 0.45);
        ctx.lineTo(-s * 0.28, s * 0.45);
        ctx.lineTo(-s * 0.28, -s * 0.2);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();                            // aletas
        ctx.moveTo(s * 0.28, s * 0.2); ctx.lineTo(s * 0.6, s * 0.55); ctx.lineTo(s * 0.28, s * 0.45);
        ctx.moveTo(-s * 0.28, s * 0.2); ctx.lineTo(-s * 0.6, s * 0.55); ctx.lineTo(-s * 0.28, s * 0.45);
        ctx.fill();
        ctx.fillStyle = rgbaStr([255, 150, 60], 0.9); // chama
        ctx.beginPath(); ctx.moveTo(0, s * 0.92); ctx.lineTo(s * 0.16, s * 0.5); ctx.lineTo(-s * 0.16, s * 0.5); ctx.closePath(); ctx.fill();
      } else if (id === 'voar') {                   // impulso/asas (setas p/ cima)
        for (let k = 0; k < 2; k++) {
          const yo = -s * 0.12 + k * s * 0.42;
          ctx.beginPath();
          ctx.moveTo(-s * 0.6, yo + s * 0.3);
          ctx.lineTo(0, yo - s * 0.25);
          ctx.lineTo(s * 0.6, yo + s * 0.3);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    const desenharBotao = (b, pressed) => {
      const g1 = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, b.r);
      g1.addColorStop(0, rgbaStr([28, 40, 64], pressed ? 0.5 : 0.26));
      g1.addColorStop(1, rgbaStr([10, 16, 28], pressed ? 0.32 : 0.12));
      ctx.fillStyle = g1;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = pressed ? rgbaStr(b.cor, 0.95) : 'rgba(255,255,255,0.2)';
      ctx.shadowColor = pressed ? rgbaStr(b.cor, 0.9) : 'rgba(0,0,0,0)';
      ctx.shadowBlur = pressed ? 12 : 0;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.stroke();
      ctx.shadowBlur = 0;
      icone(b.id, b.x, b.y, b.r * 0.78, rgbaStr(b.cor, pressed ? 1 : 0.82));
    };

    const desenharStick = (cx, cy, R, kx, ky, ativo, cor) => {
      // anel base
      ctx.strokeStyle = rgbaStr([255, 255, 255], ativo ? 0.22 : 0.1);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
      // ticks discretos
      ctx.strokeStyle = rgbaStr([255, 255, 255], ativo ? 0.14 : 0.07);
      ctx.lineWidth = 1.4;
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (R - 6), cy + Math.sin(a) * (R - 6));
        ctx.lineTo(cx + Math.cos(a) * (R - 1), cy + Math.sin(a) * (R - 1));
        ctx.stroke();
      }
      if (ativo) {
        const g = ctx.createRadialGradient(kx, ky, 1, kx, ky, 16);
        g.addColorStop(0, rgbaStr(cor, 0.55));
        g.addColorStop(1, rgbaStr(cor, 0.12));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(kx, ky, 15, 0, 7); ctx.fill();
        ctx.strokeStyle = rgbaStr([255, 255, 255], 0.32); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(kx, ky, 15, 0, 7); ctx.stroke();
      }
    };

    const passo = () => {
      raf = requestAnimationFrame(passo);
      const g = G.current;
      const { andar, correr, chao, pular, calibAndar, calibCorrer, chaoCalib } = imgsRef.current;
      if (!g || !andar || !chao) return;

      ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      const VW = canvas.width / RENDER_SCALE; g.t++;
      if (window.innerWidth <= window.innerHeight) return;
      const hud = calcHUD(VW);

      // ===== INPUT (mover + mirar) =====
      let mx = 0, intensidade = 0, aimActive = false, aimAng = 0;
      let moverAtivo = null, mirarAtivo = null;
      for (const id in g.toques) {
        const tq = g.toques[id];
        if (tq.tipo === 'mover') {
          let dx = tq.cx - tq.bx;
          const mag = Math.min(Math.abs(dx), hud.R);
          if (Math.abs(dx) > hud.R) dx = Math.sign(dx) * hud.R;
          mx = dx / hud.R; intensidade = Math.max(intensidade, mag / hud.R);
          moverAtivo = { bx: tq.bx, by: tq.by, kx: tq.bx + dx, ky: clampKnob(tq.by, tq.cy, hud.R) };
        } else if (tq.tipo === 'mirar') {
          const dx = tq.cx - tq.bx, dy = tq.cy - tq.by, mag = Math.hypot(dx, dy);
          if (mag > 7) { aimActive = true; aimAng = Math.atan2(dy, dx); }
          const cl = Math.min(mag, hud.R) / (mag || 1);
          mirarAtivo = { bx: tq.bx, by: tq.by, kx: tq.bx + dx * cl, ky: tq.by + dy * cl };
        }
      }

      // ===== FÍSICA HORIZONTAL =====
      const p = g.p;
      const correndo = intensidade > LIMIAR_CORRER;
      const velMax = correndo ? VEL_CORRER : VEL_ANDAR;
      const aceler = correndo ? 0.75 : 0.55;
      p.vx += mx * aceler; p.vx *= 0.85;
      if (Math.abs(p.vx) < 0.05) p.vx = 0;
      p.vx = Math.max(-velMax, Math.min(velMax, p.vx));
      p.x = Math.max(60, Math.min(WORLD_W - 60, p.x + p.vx));
      // direção: mira manda; senão, movimento
      if (aimActive && Math.abs(Math.cos(aimAng)) > 0.25) p.face = Math.cos(aimAng) >= 0 ? 1 : -1;
      else if (Math.abs(p.vx) > 0.3) p.face = p.vx > 0 ? 1 : -1;

      // ===== FÍSICA VERTICAL (pulo roteirizado / voo) =====
      if (g.flying && g.jump) g.jump = null;            // voar cancela o pulo roteirizado
      if (g.jump) {
        // o pulo segue a animação: a altura vem do arco, não da gravidade
        g.jump.f += JUMP_ANIM_SPEED;
        if (g.jump.f >= PULAR_FRAMES) { g.jump = null; p.y = 0; p.vy = 0; }
        else { p.y = jumpArc(g.jump.f); p.vy = 0; }
      }
      if (!g.jump) {
        if (g.flying) p.vy += FLY_THRUST;
        p.vy -= GRAV;
        p.vy = Math.max(-VY_FALL, Math.min(VY_MAX, p.vy));
        p.y += p.vy;
        if (p.y <= 0) { p.y = 0; if (p.vy < 0) p.vy = 0; }
        if (p.y >= ALT_MAX) { p.y = ALT_MAX; if (p.vy > 0) p.vy = 0; }
      }

      // ===== ANIMAÇÃO =====
      const vAbs = Math.abs(p.vx);
      const emPulo = !!(g.jump && pular);
      let modo;
      if (emPulo) modo = 'pular';
      else if (p.y > 3) modo = 'ar';
      else if (vAbs < 0.25) modo = 'parado';
      else if (correndo && vAbs > VEL_ANDAR * 0.7) modo = 'correr';
      else modo = 'andar';
      p.modo = modo;

      let sprite, calib, nFrames, frameAtual;
      if (emPulo) {
        // a folha do pulo é uma grade; o desenho é tratado em bloco próprio abaixo
      } else if (modo === 'correr' && correr) {
        sprite = correr; calib = calibCorrer; nFrames = FRAMES_CORRER;
        p.animT += vAbs * 0.07; frameAtual = Math.floor(p.animT) % nFrames;
      } else if (modo === 'andar') {
        sprite = andar; calib = calibAndar; nFrames = FRAMES_ANDAR;
        // 0.33 = cadência sincronizada com o passo: um ciclo de 35 frames corresponde
        // à distância percorrida no chão, então os pés "agarram" o solo (sem patinar).
        // Como o avanço é proporcional a vAbs, andar devagar = animação devagar e vice-versa.
        // 0.358 = cadência para 38 frames de caminhada (1 ciclo = 1 passo no chão).
        p.animT += vAbs * 0.358; frameAtual = 1 + (Math.floor(p.animT) % (FRAMES_ANDAR - 1));
      } else { sprite = andar; calib = calibAndar; nFrames = FRAMES_ANDAR; frameAtual = FRAME_PARADO; }

      // ===== CÂMERA (segue também na vertical ao voar) =====
      const zAlvo = zoomAlvoRef.current;
      const perto = zAlvo > 1.001;
      const fyAlvo = (perto ? -(ALTURA_ARMOR * 0.5) : -(ALT * 0.22)) - p.y;
      const halfW = VW / (2 * g.zoom);
      let fxAlvo = p.x;
      const minFx = halfW, maxFx = WORLD_W - halfW;
      fxAlvo = (maxFx > minFx) ? Math.max(minFx, Math.min(maxFx, fxAlvo)) : WORLD_W / 2;
      g.zoom += (zAlvo - g.zoom) * 0.08;
      g.fx += (fxAlvo - g.fx) * 0.2;
      g.fy += (fyAlvo - g.fy) * 0.1;
      const Z = g.zoom, fx = g.fx, fy = g.fy, halfWNow = VW / (2 * Z);

      // ===== FASE DO DIA =====
      let lum = 0, twi = 0, sunX = 0, sunY = 0, sunArc = 0;
      if (relogioAtivoRef.current) {
        const now = new Date();
        const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
        const { sr, ss } = solRef.current;
        const ph = faseDia(h, sr, ss); lum = ph.lum; twi = ph.twi;
        let pSun = (ss > sr) ? (h - sr) / (ss - sr) : 0.5;
        pSun = Math.max(0, Math.min(1, pSun));
        sunArc = Math.sin(pSun * Math.PI); sunX = VW * (0.12 + 0.76 * pSun); sunY = 190 - sunArc * 135;
      }

      // ===== CÉU =====
      const top = lerpArr(lerpArr(NOITE[0], DIA[0], lum), CREP[0], twi * 0.5);
      const mid = lerpArr(lerpArr(NOITE[1], DIA[1], lum), CREP[1], twi * 0.55);
      const bot = lerpArr(lerpArr(NOITE[2], DIA[2], lum), CREP[2], twi * 0.6);
      const ceu = ctx.createLinearGradient(0, 0, 0, ALT);
      ceu.addColorStop(0, rgbStr(top)); ceu.addColorStop(0.55, rgbStr(mid)); ceu.addColorStop(1, rgbStr(bot));
      ctx.fillStyle = ceu; ctx.fillRect(0, 0, VW, ALT);

      for (let i = 0; i < 60; i++) {
        const px = (((i * 137 + 53) - fx * 0.12) % (VW + 40) + VW + 40) % (VW + 40) - 20;
        const py = (i * 71 + 23) % (ALT * 0.55);
        ctx.globalAlpha = (0.25 + ((i + g.t * 0.02) % 3) * 0.2) * (1 - lum);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(px, py, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
      }
      ctx.globalAlpha = 1;

      if (lum > 0.01) {
        const sunCol = lerpArr([255, 154, 77], [255, 243, 200], sunArc);
        ctx.globalAlpha = lum;
        const haloS = ctx.createRadialGradient(sunX, sunY, 3, sunX, sunY, 80);
        haloS.addColorStop(0, rgbaStr(sunCol, 0.9)); haloS.addColorStop(1, rgbaStr([255, 180, 90], 0));
        ctx.fillStyle = haloS; ctx.fillRect(sunX - 80, sunY - 80, 160, 160);
        ctx.fillStyle = rgbStr(sunCol); ctx.beginPath(); ctx.arc(sunX, sunY, 15, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
      }
      const moonA = 1 - lum;
      if (moonA > 0.01) {
        const luaX = VW * 0.78 - fx * 0.05, luaY = 70;
        ctx.globalAlpha = moonA;
        const haloL = ctx.createRadialGradient(luaX, luaY, 4, luaX, luaY, 60);
        haloL.addColorStop(0, 'rgba(190,215,255,0.55)'); haloL.addColorStop(1, 'rgba(190,215,255,0)');
        ctx.fillStyle = haloL; ctx.fillRect(luaX - 60, luaY - 60, 120, 120);
        ctx.fillStyle = '#DCE8FF'; ctx.beginPath(); ctx.arc(luaX, luaY, 13, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
      }
      const m1 = rgbStr(lerpArr([13, 20, 40], [42, 74, 110], lum * 0.7));
      const m2 = rgbStr(lerpArr([20, 30, 56], [58, 90, 128], lum * 0.7));
      ctx.fillStyle = m1; ctx.beginPath(); ctx.moveTo(0, ALT);
      for (let x = 0; x <= VW; x += 14) { const wx = x + fx * 0.25; ctx.lineTo(x, 215 + 38 * Math.sin(wx * 0.011) + 14 * Math.sin(wx * 0.031)); }
      ctx.lineTo(VW, ALT); ctx.fill();
      ctx.fillStyle = m2; ctx.beginPath(); ctx.moveTo(0, ALT);
      for (let x = 0; x <= VW; x += 12) { const wx = x + fx * 0.4; ctx.lineTo(x, 258 + 30 * Math.sin(wx * 0.014 + 2)); }
      ctx.lineTo(VW, ALT); ctx.fill();

      // ===== MUNDO sob a câmera =====
      ctx.save();
      ctx.translate(VW / 2, ALT / 2); ctx.scale(Z, Z); ctx.translate(-fx, -fy);

      const ghW = ALTURA_IMG_CHAO, gwW = chao.width * (ghW / chao.height);
      const topR = chaoCalib ? chaoCalib.topR : 0, botR = chaoCalib ? chaoCalib.botR : 1;
      const dyImg = -topR * ghW, visH = (botR - topR) * ghW, superficie = visH * LINHA_PES;

      const leftW = fx - halfWNow - 60, rightW = fx + halfWNow + 60;
      ctx.fillStyle = (chaoCalib && chaoCalib.cor) ? chaoCalib.cor : '#0A0F1A';
      ctx.fillRect(leftW, visH - 1, rightW - leftW, 800);
      const x0 = Math.floor(leftW / gwW) * gwW;
      for (let x = x0; x < rightW; x += gwW) ctx.drawImage(chao, x, dyImg, gwW, ghW);
      if (lum > 0.01) { ctx.fillStyle = rgbaStr([170, 200, 230], lum * 0.1); ctx.fillRect(leftW, dyImg, rightW - leftW, ghW + 300); }

      const corpoY = superficie - p.y;            // sobe ao pular/voar
      const gy = corpoY - ALTURA_ARMOR * 0.62;
      const glow = ctx.createRadialGradient(p.x, gy, 5, p.x, gy, 80);
      glow.addColorStop(0, (correndo || g.flying) ? 'rgba(110,216,255,0.32)' : 'rgba(110,216,255,0.2)');
      glow.addColorStop(1, 'rgba(110,216,255,0)');
      ctx.fillStyle = glow; ctx.fillRect(p.x - 80, gy - 80, 160, 160);

      // jato ao voar (sob os pés)
      if (g.flying || p.y > 3) {
        const jy = corpoY;
        const jato = ctx.createRadialGradient(p.x, jy, 2, p.x, jy, 34);
        jato.addColorStop(0, 'rgba(150,225,255,0.5)'); jato.addColorStop(1, 'rgba(150,225,255,0)');
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = jato;
        ctx.fillRect(p.x - 34, jy - 10, 68, 44); ctx.globalCompositeOperation = 'source-over';
      }

      // PROJETO ARMOR
      const flip = (p.face === 1) !== (SPRITE_OLHA_PARA === 'direita');
      if (emPulo) {
        // grade do pulo: índice em zigue-zague (col = resto, linha = quociente)
        const jFrame = Math.min(Math.floor(g.jump.f), PULAR_FRAMES - 1);
        const cw = pular.width / PULAR_COLS, ch = pular.height / PULAR_ROWS;
        const col = jFrame % PULAR_COLS, row = Math.floor(jFrame / PULAR_COLS);
        // escala FIXA (não recalibra por frame, senão o arco do pulo achataria)
        const esc = ALTURA_ARMOR / (PULAR_BODY_R * ch);
        const dW = cw * esc, dH = ch * esc, footGap = PULAR_FOOT_R * ch * esc;
        ctx.save();
        ctx.translate(p.x, corpoY);
        if (flip) ctx.scale(-1, 1);
        // base da célula fica footGap ABAIXO de corpoY → pés plantam no solo nos frames de chão
        ctx.drawImage(pular, Math.round(col * cw), Math.round(row * ch), Math.round(cw), Math.round(ch), -dW / 2, -dH + footGap, dW, dH);
        ctx.restore();
      } else {
        const fw = sprite.width / nFrames, fh = sprite.height;
        let escala, gapPes = 0, offX = 0;
        if (calib) {
          escala = ALTURA_ARMOR / (calib.corpoR * fh);
          const f = calib.frames[frameAtual];
          gapPes = (1 - f.botR) * fh * escala; offX = (0.5 - f.cxR) * fw * escala;
        } else escala = ALTURA_ARMOR / fh;
        const destW = fw * escala, destH = fh * escala;
        ctx.save();
        ctx.translate(p.x, corpoY);
        if (flip) ctx.scale(-1, 1);
        ctx.drawImage(sprite, Math.round(frameAtual * fw), 0, Math.round(fw), fh, -destW / 2 + offX, -destH + gapPes, destW, destH);
        ctx.restore();
      }

      // ===== MIRA (origem nas mãos) =====
      const ox = p.x + p.face * 4, oy = corpoY - ALTURA_ARMOR * 0.55;
      if (aimActive) {
        const ex = ox + Math.cos(aimAng) * 120, ey = oy + Math.sin(aimAng) * 120;
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = rgbaStr(AZUL_RGB, 0.35); ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = rgbaStr(AZUL_RGB, 0.8); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(ex, ey, 7, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.arc(ex, ey, 1.6, 0, 7); ctx.stroke();
        // brilho de carga nas mãos
        const ch = ctx.createRadialGradient(ox, oy, 1, ox, oy, 12);
        ch.addColorStop(0, rgbaStr(AZUL_RGB, 0.6)); ch.addColorStop(1, rgbaStr(AZUL_RGB, 0));
        ctx.fillStyle = ch; ctx.fillRect(ox - 12, oy - 12, 24, 24);
        ctx.globalCompositeOperation = 'source-over';
      }

      // ===== ARMAS: disparar =====
      if (g.tiroCd > 0) g.tiroCd--;
      if (g.missilCd > 0) g.missilCd--;
      const dir = aimActive ? { x: Math.cos(aimAng), y: Math.sin(aimAng) } : { x: p.face, y: 0 };
      if (g.tiroHeld && g.tiroCd <= 0) {
        g.projeteis.push({ tipo: 'tiro', x: ox + dir.x * 12, y: oy + dir.y * 12, vx: dir.x * VEL_TIRO, vy: dir.y * VEL_TIRO, vida: 90 });
        g.tiroCd = COOLDOWN_TIRO;
        if (g.projeteis.length > 90) g.projeteis.shift();
      }
      if (g.missilQueued && g.missilCd <= 0) {
        g.projeteis.push({ tipo: 'missil', x: ox + dir.x * 14, y: oy + dir.y * 14, vx: dir.x * VEL_MISSIL, vy: dir.y * VEL_MISSIL, vida: 150 });
        g.missilCd = COOLDOWN_MISSIL; g.missilQueued = false;
      }

      // atualizar + desenhar projéteis (espaço do mundo)
      ctx.globalCompositeOperation = 'lighter';
      for (let i = g.projeteis.length - 1; i >= 0; i--) {
        const pr = g.projeteis[i];
        pr.x += pr.vx; pr.y += pr.vy; pr.vida--;
        if (pr.tipo === 'tiro') {
          const gl = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, 9);
          gl.addColorStop(0, rgbaStr([220, 245, 255], 0.95)); gl.addColorStop(1, rgbaStr(AZUL_RGB, 0));
          ctx.fillStyle = gl; ctx.fillRect(pr.x - 9, pr.y - 9, 18, 18);
          ctx.strokeStyle = rgbaStr([235, 250, 255], 0.9); ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x - pr.vx * 0.5, pr.y - pr.vy * 0.5); ctx.stroke();
        } else {
          g.particulas.push({ x: pr.x - pr.vx * 0.4, y: pr.y - pr.vy * 0.4, vida: 1, ouro: Math.random() < 0.6 });
          const gl = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, 13);
          gl.addColorStop(0, rgbaStr([255, 220, 150], 0.95)); gl.addColorStop(1, rgbaStr(OURO_RGB, 0));
          ctx.fillStyle = gl; ctx.fillRect(pr.x - 13, pr.y - 13, 26, 26);
          ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(Math.atan2(pr.vy, pr.vx));
          ctx.fillStyle = rgbStr(OURO_RGB); ctx.fillRect(-6, -2.4, 12, 4.8);
          ctx.restore();
        }
        if (pr.vida <= 0 || Math.abs(pr.x - p.x) > 1700) g.projeteis.splice(i, 1);
      }
      // partículas (rasto)
      for (let i = g.particulas.length - 1; i >= 0; i--) {
        const q = g.particulas[i]; q.vida -= 0.06;
        if (q.vida <= 0) { g.particulas.splice(i, 1); continue; }
        ctx.fillStyle = rgbaStr(q.ouro ? OURO_RGB : AZUL_RGB, q.vida * 0.7);
        ctx.beginPath(); ctx.arc(q.x, q.y, 2 * q.vida + 0.5, 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      ctx.restore(); // fim da câmera

      // ===== VINHETA =====
      const vin = ctx.createRadialGradient(VW / 2, ALT / 2, ALT * 0.45, VW / 2, ALT / 2, ALT * 0.95);
      vin.addColorStop(0, 'rgba(0,0,0,0)'); vin.addColorStop(1, `rgba(0,0,0,${0.42 * (1 - lum * 0.5)})`);
      ctx.fillStyle = vin; ctx.fillRect(0, 0, VW, ALT);

      // ===== HUD (sticks + botões), translúcida e por cima =====
      // home discreto dos sticks
      if (!moverAtivo) desenharStick(hud.moverBase.x, hud.moverBase.y, hud.R, 0, 0, false, AZUL_RGB);
      else desenharStick(moverAtivo.bx, moverAtivo.by, hud.R, moverAtivo.kx, moverAtivo.ky, true, correndo ? AZUL_RGB : [220, 230, 245]);
      if (!mirarAtivo) desenharStick(hud.mirarBase.x, hud.mirarBase.y, hud.R, 0, 0, false, AZUL_RGB);
      else desenharStick(mirarAtivo.bx, mirarAtivo.by, hud.R, mirarAtivo.kx, mirarAtivo.ky, true, AZUL_RGB);

      const pressed = {};
      for (const id in g.toques) { const tq = g.toques[id]; if (tq.tipo === 'btn') pressed[tq.botao] = true; }
      for (const b of hud.botoes) desenharBotao(b, !!pressed[b.id] || (b.id === 'tiro' && g.tiroHeld) || (b.id === 'voar' && g.flying));
    };

    const clampKnob = (by, cy, R) => { const d = cy - by; return by + Math.max(-R, Math.min(R, d)); };

    raf = requestAnimationFrame(passo);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('touchstart', onTS);
      canvas.removeEventListener('touchmove', onTM);
      canvas.removeEventListener('touchend', endTouch);
      canvas.removeEventListener('touchcancel', endTouch);
    };
  }, [fase]);

  // Entrar de fato no jogo (botão "Jogar").
  const entrar = async () => {
    try { await document.documentElement.requestFullscreen(); } catch (e) {}
    try { await window.screen.orientation.lock('landscape'); } catch (e) {}
    setFase('jogando');
  };
  // Toque no fundo do vídeo: só entra em tela cheia, sem iniciar o jogo.
  const entrarTelaCheia = async () => {
    if (document.fullscreenElement) return;
    try { await document.documentElement.requestFullscreen(); } catch (e) {}
    try { await window.screen.orientation.lock('landscape'); } catch (e) {}
  };
  // Botão "Sair" da tela inicial: volta para de onde o jogador veio (o card do
  // Alps OS, aberto na mesma aba). Se o jogo estiver embutido (onVoltar), usa-o.
  const sair = () => { if (onVoltar) onVoltar(); else window.history.back(); };
  const alternarZoom = () => {
    const novo = !zoomPerto; setZoomPerto(novo);
    zoomAlvoRef.current = novo ? ZOOM_PERTO : 1;
  };
  const ativarRelogio = () => {
    if (relogioAtivo) return;
    const aplicar = (lat) => {
      latRef.current = (typeof lat === 'number' && isFinite(lat)) ? lat : null;
      relogioAtivoRef.current = true; setRelogioAtivo(true);
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => aplicar(pos.coords.latitude), () => aplicar(null),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
      );
    } else aplicar(null);
  };

  return createPortal(
    <div style={es.fundo}>
      <canvas ref={canvasRef} className="armor-canvas" style={es.canvas} />

      {fase === 'jogando' && paisagem && (
        <>
          <div style={{ ...es.barra, top: 0 }} />
          <div style={{ ...es.barra, bottom: 0 }} />
          <button onClick={alternarZoom} style={es.botaoZoom} title="Alternar câmera">
            <span style={{ fontSize: 17, lineHeight: '17px' }}>{zoomPerto ? '−' : '+'}</span>
            <span style={{ fontSize: 7, letterSpacing: '0.1em', marginTop: 2 }}>{zoomPerto ? 'LONGE' : 'PERTO'}</span>
          </button>
          <button onClick={ativarRelogio} style={es.botaoRelogio} title="Relógio do mundo real">
            <span style={{ display: 'flex', alignItems: 'center', color: relogioAtivo ? AZUL : '#8E8E93' }}><IconeRelogio /></span>
            <span style={{ marginLeft: 6, fontSize: 12, letterSpacing: '0.08em', color: relogioAtivo ? '#DCE8FF' : '#8E8E93' }}>
              {relogioAtivo ? horaTexto : 'ATIVAR'}
            </span>
          </button>
        </>
      )}

      {onVoltar && <button onClick={onVoltar} style={es.voltar}>← Sair</button>}

      {fase === 'erro' && (
        <div style={es.overlay}>
          <p style={{ ...es.txtGrande, color: '#FF6B81' }}>FALHA AO CARREGAR</p>
          <p style={{ ...es.txtPeq, maxWidth: 280, textAlign: 'center', lineHeight: 1.6 }}>Verifica os links das sprites e do chão no topo do ProjetoArmor.jsx</p>
        </div>
      )}
      {fase !== 'erro' && !paisagem && (
        <div style={es.overlay}>
          <div className="armor-rotate-phone" />
          <p style={es.txtRodar}>VIRE O CELULAR</p>
        </div>
      )}
      {fase === 'pronto' && paisagem && (
        // Tela inicial = só o vídeo. Um toque em qualquer lugar entra em tela
        // cheia; os botões "Jogar" (inicia) e "Sair" (volta) ficam sobre o vídeo.
        <div style={es.overlayVideo} onClick={entrarTelaCheia} onContextMenu={(e) => e.preventDefault()}>
          {/* Vídeo do personagem: toca uma vez ao acessar e congela no último
              quadro (personagem encarando a câmera). Ao voltar do jogo não
              reinicia — mostra direto o último quadro. */}
          <video
            ref={videoIntroRef}
            style={es.videoIntro}
            src="/armor-intro.mp4"
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (introTocadaRef.current) {
                try {
                  if (isFinite(v.duration)) v.currentTime = Math.max(0, v.duration - 0.05);
                  v.pause();
                } catch (err) {}
              } else {
                v.play().catch(() => {});
              }
            }}
            onEnded={(e) => {
              const v = e.currentTarget;
              introTocadaRef.current = true;
              try {
                v.pause();
                if (isFinite(v.duration)) v.currentTime = Math.max(0, v.duration - 0.05);
              } catch (err) {}
            }}
          />
          {/* Botões Jogar/Sair sobre o vídeo: invisíveis em repouso; ao segurar,
              acendem e saltam ~1,3x a partir do centro. */}
          {BOTOES_INICIO.map((b) => (
            <div
              key={b.id}
              role="button"
              aria-label={b.id}
              onPointerDown={() => setBotaoPressionado(b.id)}
              onPointerUp={() => setBotaoPressionado(null)}
              onPointerLeave={() => setBotaoPressionado((p) => (p === b.id ? null : p))}
              onPointerCancel={() => setBotaoPressionado(null)}
              onContextMenu={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                if (b.id === 'jogar') entrar();
                else if (b.id === 'sair') sair();
              }}
              style={{
                position: 'absolute',
                left: `${b.cx}%`,
                top: `${b.cy}%`,
                width: `${b.w}%`,
                aspectRatio: `${b.aspect}`,
                backgroundImage: `url(${b.src})`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                transformOrigin: 'center',
                transform: `translate(-50%, -50%) scale(${botaoPressionado === b.id ? 1.3 : 1})`,
                opacity: botaoPressionado === b.id ? 1 : 0,
                transition: 'transform 0.12s ease, opacity 0.12s ease',
                zIndex: 3,
                cursor: 'pointer',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                touchAction: 'none',
              }}
            />
          ))}
          {/* Perfil do usuário no canto superior direito do vídeo: silhueta
              branca (asset) + nome e nível em texto (Rajdhani). Não captura
              toque, então tocar aqui ainda entra em tela cheia. */}
          <div style={es.perfilBox}>
            <img src="/silhueta-usuario.png" alt="" style={es.perfilFoto} draggable={false} />
            <div style={es.perfilTxt}>
              <span style={es.perfilNome}>Seu nome</span>
              <span style={es.perfilNivel}>Nível 0</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .armor-canvas { image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; image-rendering: pixelated; }
        /* Animação "VIRE O CELULAR" — idêntica à do jogo Free Kick World */
        .armor-rotate-phone { width:62px; height:110px; border:5px solid #7dd3fc; border-radius:14px;
          position:relative; margin-bottom:30px; box-shadow:0 0 26px rgba(125,211,252,.5);
          animation:rodarCelular 2.4s ease-in-out infinite; }
        .armor-rotate-phone::before { content:''; position:absolute; left:50%; bottom:7px; width:20px; height:4px;
          border-radius:3px; background:#7dd3fc; transform:translateX(-50%); }
        .armor-rotate-phone::after { content:''; position:absolute; inset:7px; border-radius:7px;
          background:rgba(125,211,252,.12); }
        @keyframes rodarCelular {
          0%,16%   { transform:rotate(0deg); }
          46%,72%  { transform:rotate(-90deg); }
          96%,100% { transform:rotate(0deg); }
        }
      `}</style>
    </div>,
    document.body
  );
}

const es = {
  fundo: { position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 999999, overflow: 'hidden', touchAction: 'none' },
  canvas: { width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated', touchAction: 'none' },
  barra: { position: 'absolute', left: 0, width: '100%', height: 22, backgroundColor: '#000', zIndex: 5, pointerEvents: 'none' },
  botaoZoom: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 42, height: 46, borderRadius: 14, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.14)', color: '#8E8E93', cursor: 'pointer', zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' },
  botaoRelogio: { position: 'absolute', top: 30, right: 16, display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 20, padding: '6px 12px', cursor: 'pointer', zIndex: 30, fontFamily: 'monospace' },
  voltar: { position: 'absolute', top: 30, left: 16, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, color: '#8E8E93', fontSize: 13, padding: '6px 13px', cursor: 'pointer', zIndex: 30 },
  overlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20, backdropFilter: 'blur(4px)', fontFamily: 'monospace' },
  txtRodar: { color: '#7dd3fc', fontSize: 'clamp(20px,6vw,30px)', fontWeight: 700, letterSpacing: '2px', textShadow: '2px 2px 0 #0a3d62', margin: 0 },
  txtGrande: { color: '#F0C040', fontSize: 19, fontWeight: 700, letterSpacing: '0.18em', margin: '0 0 8px' },
  txtPeq: { color: '#8E8E93', fontSize: 12, letterSpacing: '0.1em', margin: 0 },
  videoIntro: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, backgroundColor: '#000' },
  // Tela inicial: só o vídeo (fundo transparente), com botões/perfil por cima.
  overlayVideo: { position: 'absolute', inset: 0, zIndex: 20, overflow: 'hidden', cursor: 'pointer' },
  // Perfil no canto superior direito do vídeo: silhueta à esquerda, nome em
  // cima e nível logo abaixo.
  perfilBox: { position: 'absolute', left: '72%', top: '3.6%', width: '20.5%', height: '17%', display: 'flex', alignItems: 'center', boxSizing: 'border-box', zIndex: 3, pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none', fontFamily: "'Rajdhani', sans-serif" },
  perfilFoto: { position: 'absolute', left: '16%', top: '50%', transform: 'translate(-50%, -50%)', height: '82%', aspectRatio: '1', objectFit: 'contain', filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.55))' },
  perfilTxt: { display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.12, minWidth: 0, marginLeft: '40%' },
  perfilNome: { color: '#FFFFFF', fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: 'clamp(12px,2.3vw,28px)', letterSpacing: '0.01em', whiteSpace: 'nowrap', textShadow: '0 1px 5px rgba(0,0,0,0.7)' },
  perfilNivel: { color: '#FFFFFF', fontFamily: "'Rajdhani', sans-serif", fontWeight: 500, fontSize: 'clamp(11px,2.0vw,24px)', letterSpacing: '0.01em', whiteSpace: 'nowrap', textShadow: '0 1px 5px rgba(0,0,0,0.7)' },
};