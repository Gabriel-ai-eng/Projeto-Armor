import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { carregarEstado, salvarEstado, estadoInicial } from '../lib/playerSave';

// ============================================================
// PROJETO ARMOR — Capítulo 1: O Despertar
// HUD dupla: joystick mover (esq) + mirar (dir) · tiro · míssil · voar
// ============================================================

// Caminho base do deploy (definido pelo Vite: '/jogo/' em produção sob o domínio
// da plataforma, '/' no dev/standalone). Todos os assets da pasta public precisam
// deste prefixo para resolverem corretamente através do proxy do domínio.
const asset = (p) => import.meta.env.BASE_URL + p;

// ?v=N força o navegador/CDN a baixar a imagem nova quando ela muda (cache-busting).
// Incremente o número sempre que trocar o conteúdo de armor-andar.png.
// As folhas de andar/idle são pré-redimensionadas (offline, Lanczos) para o
// corpo medir exatamente 105·RENDER_SCALE px: o canvas copia 1:1, sem
// reamostragem por frame → nítido e sem tremor (pixel crawl) no nearest.
const SPRITE_ANDAR = asset('armor-andar.png?v=11');
// Idle: personagem respirando/olhando em volta quando parado (loop contínuo).
const SPRITE_PARADO_ANIM = asset('armor-parado.png?v=5');
const SPRITE_CORRER = 'https://i.ibb.co/tTxmyXws/titan-correr-tira.png';
// Pulo: folha em GRADE (10 colunas x 17 linhas = 170 frames), lida em zigue-zague
// esquerda→direita, de cima→baixo. O ciclo completo: agacha (anticipação) →
// impulso a jato → voo → aterrissagem com poeira → recupera e fica de pé.
const SPRITE_PULAR = asset('armor-pular.png?v=1');
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

const FRAMES_ANDAR = 71;   // frame 0 = parado; frames 1..70 = ciclo de caminhada (da folha, em ordem)
const FRAMES_CORRER = 15;
const FRAME_PARADO = 0;          // frame da folha de andar usado se o idle não carregar
const FRAMES_PARADO_ANIM = 100;  // folha do idle (1 de cada 3 frames do original)
const PARADO_FPS = 10;           // 100 frames a 10 fps = loop de ~10 s, ritmo original

// ---- Speed matching (anti-patinação), medido da própria folha ----
// Rastreando o pé de apoio frame a frame: os 70 frames contêm 4 passos
// (2 ciclos de marcha) e o pé de apoio recua 169,7 px de folha no total.
// Na escala do jogo (105 px de corpo ÷ 231 px na folha ≈ 0,4545), a folha
// inteira corresponde a um deslocamento de ~77 px de mundo.
const ANDAR_PASSADA_PX = 77;                                   // px de mundo por volta completa da folha
const ANDAR_FRAMES_POR_PX = (FRAMES_ANDAR - 1) / ANDAR_PASSADA_PX; // ≈ 0.91: frames por px andado

// Velocidade máxima da caminhada. A animação avança por px percorrido,
// então qualquer velocidade ≤ esta mantém os pés grudados; a 0,85 px/tick
// a folha fecha em ~1,5 s (~0,38 s por passo — andar firme, sem exagero).
const VEL_ANDAR = 0.85;
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


// Botões "Jogar" e "Sair" desenhados sobre o vídeo da tela inicial: invisíveis
// em repouso, saltam (~1,3x) e acendem ao serem pressionados. Posições/tamanhos
// em % do vídeo, iguais à tela inicial original.
const BOTOES_INICIO = [
  { id: 'jogar',         src: asset('btn-jogar.png'),         cx: 13.26, cy: 37.82, w: 20.4, aspect: 4.07 },
  { id: 'armadura',      src: asset('btn-armadura.png'),      cx: 14.54, cy: 47.90, w: 16.9, aspect: 4.93 },
  { id: 'missoes',       src: asset('btn-missoes.png'),       cx: 14.51, cy: 56.60, w: 16.8, aspect: 5.06 },
  { id: 'loja',          src: asset('btn-loja.png'),          cx: 14.54, cy: 65.56, w: 16.9, aspect: 5.22 },
  { id: 'ranking',       src: asset('btn-ranking.png'),       cx: 14.51, cy: 74.10, w: 16.8, aspect: 5.25 },
  { id: 'configuracoes', src: asset('btn-configuracoes.png'), cx: 14.54, cy: 83.13, w: 16.9, aspect: 5.33 },
  { id: 'sair',          src: asset('btn-sair.png'),          cx: 12.98, cy: 91.18, w: 17.1, aspect: 4.84 },
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
  const [knobOff, setKnobOff] = useState({ x: 0, y: 0 }); // knob do joystick de mover
  const [miraOff, setMiraOff] = useState({ x: 0, y: 0 }); // knob do joystick de mirar
  const [voarAtivo, setVoarAtivo] = useState(false);      // feedback visual do botão de voar
  const [nivel, setNivel] = useState(0);                  // nível do jogador (salvo no Supabase)
  const [paisagem, setPaisagem] = useState(
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : true
  );

  const canvasRef = useRef(null);
  const G = useRef(null);
  const zoomAlvoRef = useRef(1);
  const relogioAtivoRef = useRef(false);
  const solRef = useRef({ sr: 6.5, ss: 18.5 });
  const latRef = useRef(null);
  const imgsRef = useRef({ andar: null, correr: null, chao: null, pular: null, parado: null, calibAndar: null, calibCorrer: null, calibParado: null, chaoCalib: null });
  const videoIntroRef = useRef(null);
  // Vídeo da intro baixado inteiro para a memória (blob) assim que o app abre:
  // quando o celular vira para paisagem, toca na hora, sem buffering de rede.
  const [videoIntroSrc, setVideoIntroSrc] = useState(null);
  const introTocouRef = useRef(false);
  // Guarda a orientação anterior para detectar a transição retrato→paisagem
  // (é o único gatilho que inicia o vídeo da intro).
  const prevPaisagemRef = useRef(false);
  // Joysticks por imagem (leitura entregue ao loop do jogo via refs).
  const moveRef = useRef({ x: 0, mag: 0 });   // mover: x = -1..1, mag = 0..1
  const joyBaseRef = useRef(null);
  const joyPointerRef = useRef(null);
  const aimRef = useRef({ active: false, ang: 0 }); // mirar: direção + se dispara
  const miraBaseRef = useRef(null);
  // Estado persistido no Supabase (prefs + estatísticas + progresso).
  const estadoRef = useRef(estadoInicial());
  const carregadoRef = useRef(false); // só salva depois que carregou (evita apagar)
  const miraPointerRef = useRef(null);

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
      // Idle é opcional: se falhar, cai no frame parado da folha de andar.
      carregarSprite(SPRITE_PARADO_ANIM, (im) => calibrar(im, FRAMES_PARADO_ANIM)).catch(() => null),
    ]).then(([a, r, solo, pl, idle]) => {
      if (!vivos) return;
      // A folha do idle já vem com os pés ancorados no mesmo ponto de cada
      // célula. Usamos a leitura do frame 0 para TODOS os frames: offset de
      // desenho constante → pés fixos no chão (a autocalibração por frame
      // compensaria o balanço do corpo e faria os pés tremerem).
      if (idle && idle.leitura && idle.leitura.frames.length) {
        const base = idle.leitura.frames[0];
        idle.leitura = { ...idle.leitura, frames: idle.leitura.frames.map(() => base) };
      }
      imgsRef.current = {
        andar: a.img, calibAndar: a.leitura, correr: r.img, calibCorrer: r.leitura,
        chao: solo.img, chaoCalib: solo.leitura, pular: pl.img,
        parado: idle ? idle.img : null, calibParado: idle ? idle.leitura : null,
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

  // ---------- SAVE NA NUVEM (Supabase) ----------
  // No primeiro acesso é gerado um código único (localStorage); é por ele que o
  // Supabase identifica o jogador. Ao abrir: carrega o estado salvo, reaplica as
  // preferências, conta mais uma sessão e regrava.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const est = await carregarEstado();
      if (!vivo) return;
      // reaplica preferências salvas
      if (est.prefs.zoomPerto) { setZoomPerto(true); zoomAlvoRef.current = ZOOM_PERTO; }
      if (est.prefs.relogioAtivo) { relogioAtivoRef.current = true; setRelogioAtivo(true); }
      setNivel(est.progresso.nivel || 0);
      // registra a sessão atual
      const agora = new Date().toISOString();
      est.stats.sessoes = (est.stats.sessoes || 0) + 1;
      est.stats.primeiraVez = est.stats.primeiraVez || agora;
      est.stats.ultimaVez = agora;
      estadoRef.current = est;
      carregadoRef.current = true;
      salvarEstado(est);
    })();
    return () => { vivo = false; };
  }, []);

  // Enquanto joga, acumula tempo jogado, sobe de nível (1 nível a cada 2 min) e
  // grava periodicamente. Também grava ao sair do modo "jogando".
  useEffect(() => {
    if (fase !== 'jogando' || !carregadoRef.current) return;
    const id = setInterval(() => {
      const est = estadoRef.current;
      est.stats.tempoJogadoSeg = (est.stats.tempoJogadoSeg || 0) + 15;
      est.stats.ultimaVez = new Date().toISOString();
      const nv = Math.floor(est.stats.tempoJogadoSeg / 120);
      if (nv !== est.progresso.nivel) {
        est.progresso.nivel = nv;
        est.progresso.xp = est.stats.tempoJogadoSeg;
        setNivel(nv);
      }
      sincronizarPos();
      salvarEstado(est);
    }, 15000);
    return () => { clearInterval(id); if (carregadoRef.current) { sincronizarPos(); salvarEstado(estadoRef.current); } };
  }, [fase]);

  // Garante a gravação quando o app é minimizado ou fechado.
  useEffect(() => {
    const salvarSaindo = () => {
      if (carregadoRef.current && document.visibilityState === 'hidden') { sincronizarPos(); salvarEstado(estadoRef.current); }
    };
    document.addEventListener('visibilitychange', salvarSaindo);
    window.addEventListener('pagehide', salvarSaindo);
    return () => {
      document.removeEventListener('visibilitychange', salvarSaindo);
      window.removeEventListener('pagehide', salvarSaindo);
    };
  }, []);

  const initGame = () => {
    // Retoma a posição salva (onde o jogador parou); na primeira vez usa o padrão.
    const salvo = estadoRef.current && estadoRef.current.pos;
    const px = salvo && typeof salvo.x === 'number' ? salvo.x : 260;
    const py = salvo && typeof salvo.y === 'number' ? salvo.y : 0;
    const face = salvo && salvo.face === -1 ? -1 : 1;
    G.current = {
      p: { x: px, y: py, vx: 0, vy: 0, face, animT: 0, modo: 'parado' },
      fx: px, fy: -(ALT * 0.22), zoom: zoomAlvoRef.current,
      t: 0, toques: {},
      flying: false, lastFlyDown: 0, jump: null,
      tiroHeld: false, tiroCd: 0, missilQueued: false, miss