import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { carregarEstado, salvarEstado, estadoInicial, carregarFotoPerfil, emailDaConta } from '../lib/playerSave';
import { ALT, RENDER_SCALE, ZOOM_PERTO, AZUL, OURO } from './ajustes';
import { asset, BOTOES_INICIO } from './sprites';
import { calcularSol } from './mundo';
import { carregarSprites } from './carregarSprites';
import { criarLoop } from './render';
import { Z_INICIAL, CAMADAS, COLISOES } from './cenario/mapa';
import { LUZ, PRESETS, definirLuz, aplicarPreset } from './cenario/luzes';
import { criarControles } from './controles';
import { es, CSS_ARMOR } from './estilos';
import Configuracoes from './Configuracoes'; // (1) nova importação

// Vídeo da tela inicial: WebM/VP9 (bem mais leve) quando o navegador toca,
// senão cai para o MP4/H.264 (fallback universal, ex.: Safari/iOS antigos).
// `canPlayType` é a forma padrão de detectar isso — evita mandar um arquivo
// que o navegador não sabe decodificar.
const SUPORTA_WEBM =
  typeof document !== 'undefined' &&
  document.createElement('video').canPlayType('video/webm; codecs="vp9"') !== '';
const INTRO_SRC = SUPORTA_WEBM ? asset('armor-intro.webm?v=1') : asset('armor-intro.mp4?v=6');

// Cache local (mesmo localStorage do AlpsPrime-OS, mesma origem) do último
// nome/foto vistos — mostra o perfil na hora ao entrar, sem esperar a volta
// do Supabase; o carregamento em segundo plano (useEffect abaixo) confirma/
// atualiza o valor logo em seguida.
const PERFIL_CACHE_KEY = 'armor_perfil_cache_v1';
function lerPerfilCache() {
  try {
    const raw = localStorage.getItem(PERFIL_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}
function salvarPerfilCache(patch) {
  try {
    localStorage.setItem(PERFIL_CACHE_KEY, JSON.stringify({ ...lerPerfilCache(), ...patch }));
  } catch (e) {}
}

function IconeRelogio({ size = 13 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

// Lupa com + (aproximar) ou - (afastar) — mostra a AÇÃO que o botão vai fazer.
function IconeZoom({ aproximar, size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6.5" />
      <line x1="20" y1="20" x2="15.8" y2="15.8" />
      {aproximar && <line x1="11" y1="8.2" x2="11" y2="13.8" />}
      <line x1="8.2" y1="11" x2="13.8" y2="11" />
    </svg>
  );
}

// Ícone de menu (hambúrguer) — abre o painel de pausa (Continuar/Sair).
function IconeMenu({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

export default function ProjetoArmor({ onVoltar }) {
  const [fase, setFase] = useState('carregando');
  const [zoomPerto, setZoomPerto] = useState(false);
  const [relogioAtivo, setRelogioAtivo] = useState(false);
  const [horaTexto, setHoraTexto] = useState('--:--');
  const [nivel, setNivel] = useState(0);
  const [nomePiloto, setNomePiloto] = useState(() => lerPerfilCache().nomePiloto || '');
  const [fotoPerfil, setFotoPerfil] = useState(() => lerPerfilCache().fotoPerfil || null);
  const [emailConta, setEmailConta] = useState(null);
  const sensibilidadeRef = useRef(50);
  const vibracaoRef = useRef(true);
  const volumeEfeitosRef = useRef(85); // "Volume dos efeitos" — bip dos botões da tela inicial

  const btnRefs = useRef({});
  const arrastoMenuRef = useRef({ ativo: false, atual: null, inicio: null, vagou: false });

  const [knobOff, setKnobOff] = useState({ x: 0, y: 0 });
  const [miraOff, setMiraOff] = useState({ x: 0, y: 0 });
  const [voarAtivo, setVoarAtivo] = useState(false);
  const [lutarAtivo, setLutarAtivo] = useState(false);

  const [paisagem, setPaisagem] = useState(
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : true
  );

  // Estado para a mensagem "Em breve"
  const [emBreve, setEmBreve] = useState(false);
  const emBreveTimerRef = useRef(null);

  // (2) novo estado para o modal de configurações
  const [mostrarConfig, setMostrarConfig] = useState(false);

  // Painel de pausa (aberto pelo ícone de menu/hambúrguer no lugar do antigo
  // botão "Voltar"): Continuar fecha o painel, Sair volta à tela inicial.
  const [menuPausa, setMenuPausa] = useState(false);

  const canvasRef = useRef(null);
  const G = useRef(null);

  const zoomAlvoRef = useRef(1);
  const relogioAtivoRef = useRef(false);
  const solRef = useRef({ sr: 6.5, ss: 18.5 });
  const latRef = useRef(null);

  const imgsRef = useRef({
    andar: null,
    correr: null,
    pular: null,
    parado: null,
    agachar: null,
    socar: null,
    calibAndar: null,
    calibCorrer: null,
    calibParado: null,
    calibPular: null,
    calibAgachar: null,
    calibSocar: null,
    // atlas do cenário modular do hangar (src/game/cenario/)
    cenario: null,
    emissivo: null,
  });

  const videoIntroRef = useRef(null);
  const [videoIntroSrc, setVideoIntroSrc] = useState(null);
  const introTocouRef = useRef(false);
  const prevPaisagemRef = useRef(false);

  const moveRef = useRef({ x: 0, y: 0, mag: 0 });
  const joyBaseRef = useRef(null);
  const joyPointerRef = useRef(null);

  const aimRef = useRef({ active: false, ang: 0 });
  const miraBaseRef = useRef(null);
  const miraPointerRef = useRef(null);

  const estadoRef = useRef(estadoInicial());
  const carregadoRef = useRef(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    let vivos = true;
    // Console de controle do cenário em tempo real (útil para testar/afinar):
    //   window.ARMOR_CENARIO.aplicarPreset('alerta' | 'noturno' | 'claro' ...)
    //   window.ARMOR_CENARIO.definirLuz('cubo', { cor: '#ff44aa', intensidade: 1.2 })
    window.ARMOR_CENARIO = { LUZ, PRESETS, definirLuz, aplicarPreset, CAMADAS, COLISOES };
    // As folhas pesadas (correr/pular/parado) chegam DEPOIS, em segundo plano,
    // via patch — o menu abre só com o essencial (andar + chão), bem mais rápido.
    carregarSprites((patch) => {
      if (vivos) imgsRef.current = { ...imgsRef.current, ...patch };
    })
      .then((imgs) => {
        if (!vivos) return;
        imgsRef.current = { ...imgsRef.current, ...imgs };
        setFase('pronto');
      })
      .catch(() => vivos && setFase('erro'));
    return () => {
      vivos = false;
      document.body.style.overflow = 'auto';
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      try {
        window.screen.orientation?.unlock?.();
      } catch (e) {}
    };
  }, []);

  useEffect(() => {
    const mqLandscape = window.matchMedia('(orientation: landscape)');

    const redimensionar = () => {
      const ww = window.innerWidth;
      const wh = window.innerHeight;
      const landscape = mqLandscape.matches || ww > wh;
      setPaisagem(landscape);

      if (landscape && !document.fullscreenElement) {
        try {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } catch (e) {}
        try {
          window.screen.orientation?.lock?.('landscape').catch(() => {});
        } catch (e) {}
      }

      const c = canvasRef.current;
      if (c) {
        c.height = ALT * RENDER_SCALE;
        c.width = Math.max(480, Math.round((ALT * ww) / wh)) * RENDER_SCALE;
      }
    };

    redimensionar();
    window.addEventListener('resize', redimensionar);
    window.addEventListener('orientationchange', redimensionar);

    if (mqLandscape.addEventListener) mqLandscape.addEventListener('change', redimensionar);
    else if (mqLandscape.addListener) mqLandscape.addListener(redimensionar);

    try {
      window.screen.orientation?.addEventListener?.('change', redimensionar);
    } catch (e) {}

    return () => {
      window.removeEventListener('resize', redimensionar);
      window.removeEventListener('orientationchange', redimensionar);
      if (mqLandscape.removeEventListener) mqLandscape.removeEventListener('change', redimensionar);
      else if (mqLandscape.removeListener) mqLandscape.removeListener(redimensionar);
      try {
        window.screen.orientation?.removeEventListener?.('change', redimensionar);
      } catch (e) {}
    };
  }, []);

  // ---------- TELA CHEIA NO PRIMEIRO TOQUE ----------
  useEffect(() => {
    const aoTocar = () => {
      if (window.innerWidth > window.innerHeight && !document.fullscreenElement) {
        try {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } catch (e) {}
        try {
          window.screen.orientation.lock('landscape').catch(() => {});
        } catch (e) {}
      }
    };
    document.addEventListener('pointerdown', aoTocar, true);
    return () => document.removeEventListener('pointerdown', aoTocar, true);
  }, []);

  // ---------- RELÓGIO EM TEMPO REAL ----------
  useEffect(() => {
    if (!relogioAtivo) return;
    const atualizar = () => {
      const now = new Date();
      setHoraTexto(
        String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
      );
      const lat = latRef.current;
      solRef.current = lat !== null ? calcularSol(lat, now) : { sr: 6.5, ss: 18.5 };
    };

    atualizar();
    const id = setInterval(atualizar, 1000);
    return () => clearInterval(id);
  }, [relogioAtivo]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const est = await carregarEstado();
      if (!vivo) return;

      if (est.prefs.zoomPerto) {
        setZoomPerto(true);
        zoomAlvoRef.current = ZOOM_PERTO;
      }

      if (est.prefs.relogioAtivo) {
        relogioAtivoRef.current = true;
        setRelogioAtivo(true);
      }

      // Nível fica fixo em 0 por enquanto (tela inicial e Configurações) —
      // o progresso continua sendo salvo por baixo, só não é exibido ainda.
      // Só atualiza o nome (e o cache) quando vier um valor de verdade — não
      // apaga o que já apareceu na hora (cache) por causa de uma falha
      // passageira de rede, que devolve o mesmo formato "vazio" de sem-sessão.
      if (est.prefs.nomePiloto) {
        setNomePiloto(est.prefs.nomePiloto);
        salvarPerfilCache({ nomePiloto: est.prefs.nomePiloto });
      }
      sensibilidadeRef.current =
        typeof est.prefs.sensibilidade === 'number' ? est.prefs.sensibilidade : 50;
      vibracaoRef.current = est.prefs.vibracao !== false;
      volumeEfeitosRef.current =
        typeof est.prefs.volumeEfeitos === 'number' ? est.prefs.volumeEfeitos : 85;
      estadoRef.current = est;
      carregadoRef.current = true;
      await salvarEstado(est);
    })();

    // Foto de perfil: busca à parte (não faz parte do `state` do jogo, vem
    // direto da tabela `usuarios` da plataforma) — não precisa esperar o
    // estado do jogo para aparecer.
    (async () => {
      const url = await carregarFotoPerfil();
      if (vivo && url) {
        setFotoPerfil(url);
        salvarPerfilCache({ fotoPerfil: url });
      }
    })();

    // E-mail da conta (só leitura, exibido no painel de Configurações).
    (async () => {
      const mail = await emailDaConta();
      if (vivo) setEmailConta(mail);
    })();

    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (fase !== 'jogando' || !carregadoRef.current) return;

    const id = setInterval(() => {
      const est = estadoRef.current;
      est.stats.tempoJogadoSeg = (est.stats.tempoJogadoSeg || 0) + 15;
      est.stats.ultimaVez = new Date().toISOString();

      // Nível continua sendo calculado/salvo, só não é mais mostrado na UI
      // (fica fixo em 0 na tela inicial e nas Configurações por enquanto).
      const nv = Math.floor(est.stats.tempoJogadoSeg / 120);
      if (nv !== est.progresso.nivel) {
        est.progresso.nivel = nv;
        est.progresso.xp = est.stats.tempoJogadoSeg;
      }

      sincronizarPos();
      salvarEstado(est);
    }, 15000);

    return () => clearInterval(id);
  }, [fase]);

  useEffect(() => {
    const salvarSaindo = () => {
      if (carregadoRef.current && document.visibilityState === 'hidden') {
        sincronizarPos();
        salvarEstado(estadoRef.current);
      }
    };

    document.addEventListener('visibilitychange', salvarSaindo);
    window.addEventListener('pagehide', salvarSaindo);

    return () => {
      document.removeEventListener('visibilitychange', salvarSaindo);
      window.removeEventListener('pagehide', salvarSaindo);
    };
  }, []);

  const sincronizarPos = () => {
    const g = G.current;
    if (!g || !g.p || !estadoRef.current) return;
    estadoRef.current.pos = { x: g.p.x, y: g.p.y, face: g.p.face };
  };

  const initGame = () => {
    const salvo = estadoRef.current.pos || {};
    // O personagem NASCE em pé DENTRO do cubo holográfico do cenário: no centro
    // da plataforma (x≈850), apoiado no topo dela (y=72 = altura da plataforma)
    // e na profundidade z=27, que casa o pé com a superfície e deixa o cubo
    // (baseZ 32) ordenado à frente, envolvendo o personagem.
    const px = 850, py = 72, pz = 27;
    const face = salvo.face === -1 ? -1 : 1;

    G.current = {
      // z = profundidade no piso do hangar (joystick para cima/baixo)
      p: { x: px, y: py, z: pz, vx: 0, vy: 0, vz: 0, face, animT: 0, modo: 'parado' },
      fx: px,
      fy: -ALT * 0.22,
      zoom: zoomAlvoRef.current,
      t: 0,
      toques: 0,
      flying: false,
      lastFlyDown: 0,
      jump: null,
      tiroHeld: false,
      tiroCd: 0,
      projeteis: [],
    };
  };

  useEffect(() => {
    if (fase !== 'jogando') return;
    initGame();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const loop = criarLoop({
      ctx,
      canvas,
      G,
      imgsRef,
      zoomAlvoRef,
      relogioAtivoRef,
      solRef,
      moveRef,
      aimRef,
      vibracaoRef,
      volumeEfeitosRef,
    });

    loop.start();
    return () => loop.stop();
  }, [fase]);

  const entrar = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (e) {}
    try {
      await window.screen.orientation.lock('landscape');
    } catch (e) {}
    setFase('jogando');
  };

  const entrarTelaCheia = async () => {
    if (document.fullscreenElement) return;
    try {
      await document.documentElement.requestFullscreen();
    } catch (e) {}
    try {
      await window.screen.orientation.lock('landscape');
    } catch (e) {}
  };

  const sair = () => {
    if (onVoltar) onVoltar();
    else window.history.back();
  };

  // Função para exibir a mensagem "Em Breve"
  const mostrarEmBreve = () => {
    setEmBreve(true);
    if (emBreveTimerRef.current) clearTimeout(emBreveTimerRef.current);
    emBreveTimerRef.current = setTimeout(() => {
      setEmBreve(false);
    }, 2000);
  };

  // (3) função para abrir as configurações
  const abrirConfiguracoes = () => {
    setMostrarConfig(true);
  };

  // Aplica uma preferência editada no painel em memória e no efeito ao vivo
  // (nome no perfil, sensibilidade da mira). A gravação no Supabase é feita
  // depois, por `persistirEstado` (chamado pelo painel ao soltar o controle).
  const aplicarPref = (chave, valor) => {
    estadoRef.current.prefs[chave] = valor;
    if (chave === 'nomePiloto') setNomePiloto(valor);
    if (chave === 'sensibilidade') sensibilidadeRef.current = valor;
    if (chave === 'vibracao') vibracaoRef.current = valor;
    if (chave === 'volumeEfeitos') volumeEfeitosRef.current = valor;
  };

  const persistirEstado = () => {
    if (!carregadoRef.current) return Promise.resolve(false);
    return salvarEstado(estadoRef.current);
  };

  // Alterna o zoom da câmera (perto/longe) e salva a preferência. Também
  // recentraliza a câmera no personagem — desfaz qualquer arrasto manual
  // (ver controles.js) que tenha deixado o foco fora dele.
  const alternarZoom = () => {
    const novo = !zoomPerto;
    setZoomPerto(novo);
    zoomAlvoRef.current = novo ? ZOOM_PERTO : 1;
    if (G.current) G.current.camPanX = 0;
    estadoRef.current.prefs.zoomPerto = novo;
    if (carregadoRef.current) salvarEstado(estadoRef.current);
  };

  const ativarRelogio = () => {
    if (relogioAtivo) return;

    const aplicar = (lat) => {
      latRef.current = typeof lat === 'number' && isFinite(lat) ? lat : null;
      relogioAtivoRef.current = true;
      setRelogioAtivo(true);
      estadoRef.current.prefs.relogioAtivo = true;
      if (carregadoRef.current) salvarEstado(estadoRef.current);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => aplicar(pos.coords.latitude),
        () => aplicar(null),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
      );
    } else {
      aplicar(null);
    }
  };

  // ---------- CONTROLES (joysticks + voar + onda do menu) ----------
  const {
    menuDown,
    menuMove,
    menuUp,
    menuFimAnim,
    joyInicio,
    joyMover,
    joyFim,
    voarPress,
    voarRelease,
    lutarPress,
    lutarRelease,
    miraInicio,
    miraMover,
    miraFim,
  } = criarControles({
    setKnobOff,
    setMiraOff,
    setVoarAtivo,
    setLutarAtivo,
    moveRef,
    aimRef,
    joyBaseRef,
    joyPointerRef,
    miraBaseRef,
    miraPointerRef,
    G,
    btnRefs,
    arrastoMenuRef,
    entrar,
    sair,
    mostrarEmBreve,
    abrirConfiguracoes, // (4) passa a função para controles
    sensibilidadeRef,   // sensibilidade da mira (painel de Configurações)
    zoomAlvoRef,         // pinça (fora do manche/mira) ajusta o zoom por aqui
    volumeEfeitosRef,    // bip ao clicar nos botões da tela inicial
  });

  useEffect(() => {
    if (fase !== 'pronto') return;
    const was = prevPaisagemRef.current;
    prevPaisagemRef.current = paisagem;
    if (!paisagem && was) return;

    const v = videoIntroRef.current;
    if (!v) return;
    introTocouRef.current = true;
    try {
      v.currentTime = 0;
    } catch (err) {}
    v.play().catch(() => {});
  }, [fase, paisagem]);

  useEffect(() => {
    let vivo = true;
    let url = null;

    fetch(INTRO_SRC)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('http'))))
      .then((b) => {
        if (!vivo || introTocouRef.current) return;
        url = URL.createObjectURL(b);
        setVideoIntroSrc(url);
      })
      .catch(() => {});

    return () => {
      vivo = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  return createPortal(
    <div
      className="armor-game-root"
      style={es.fundo}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} className="armor-canvas" style={es.canvas} />

      {fase === 'jogando' && paisagem && (
        <div>
          <div style={{ ...es.barra, top: 0 }} />
          <div style={{ ...es.barra, bottom: 0 }} />

          <button
            onClick={alternarZoom}
            className="armor-hud-btn"
            style={es.botaoZoom}
            title="Alternar câmera"
            aria-label="Alternar câmera"
          >
            <IconeZoom aproximar={!zoomPerto} />
            <span style={{ fontSize: 8, letterSpacing: '0.14em', marginTop: 3 }}>
              {zoomPerto ? 'LONGE' : 'PERTO'}
            </span>
          </button>

          <button
            onClick={ativarRelogio}
            className={`armor-hud-btn armor-hud-pill${relogioAtivo ? ' is-ativo' : ''}`}
            style={es.botaoRelogio}
            title="Relógio do mundo real"
            aria-label="Relógio do mundo real"
          >
            <IconeRelogio />
            <span style={{ marginLeft: 6, fontSize: 12, letterSpacing: '0.08em' }}>
              {relogioAtivo ? horaTexto : 'ATIVAR'}
            </span>
          </button>

          <button
            onClick={() => setMenuPausa(true)}
            className="armor-hud-btn"
            style={es.menuBtn}
            title="Menu"
            aria-label="Menu"
          >
            <IconeMenu />
          </button>

          <div
            style={es.joyZona}
            onPointerDown={joyInicio}
            onPointerMove={joyMover}
            onPointerUp={joyFim}
            onPointerCancel={joyFim}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div
              ref={joyBaseRef}
              style={{
                ...es.joyBase,
                transform:
                  knobOff.x || knobOff.y
                    ? 'translate(-50%, -50%) scale(1.06)'
                    : 'translate(-50%, -50%)',
              }}
            />
            <div
              style={{
                ...es.joyKnob,
                transform: `translate(calc(-50% + ${knobOff.x}px), calc(-50% + ${knobOff.y}px))`,
              }}
            />
          </div>

          <div
            className={`armor-action-btn is-voar${voarAtivo ? ' is-ativo' : ''}`}
            role="button"
            aria-label="Pular"
            draggable="false"
            onPointerDown={voarPress}
            onPointerUp={voarRelease}
            onPointerCancel={voarRelease}
            onPointerLeave={voarRelease}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              ...es.botaoVoar,
              transform: `translate(-50%, -50%) scale(${voarAtivo ? 1.1 : 1})`,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13.5L12 6l7 7.5" />
              <path d="M5 19L12 11.5L19 19" opacity="0.55" />
            </svg>
          </div>

          <div
            className={`armor-action-btn is-lutar${lutarAtivo ? ' is-ativo' : ''}`}
            role="button"
            aria-label="Lutar"
            draggable="false"
            onPointerDown={lutarPress}
            onPointerUp={lutarRelease}
            onPointerCancel={lutarRelease}
            onPointerLeave={lutarRelease}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              ...es.botaoLutar,
              transform: `translate(-50%, -50%) scale(${lutarAtivo ? 1.1 : 1})`,
            }}
          >
            {/* Punho cibernético: mesma paleta da manopla do personagem (chapa
                escura, trim dourado nos nós dos dedos/punho, núcleo azul
                aceso no dorso da mão) — em vez de um ícone genérico. */}
            <svg viewBox="0 0 24 24" fill="none" stroke="none">
              <rect x="8.1" y="17.3" width="7.8" height="3.5" rx="1.2" fill="#141a24" stroke={OURO} strokeWidth="1" />
              <rect x="5.5" y="8.3" width="13" height="9.7" rx="3.2" fill="#141a24" stroke={OURO} strokeWidth="1" />
              <rect x="3.4" y="11.5" width="3.7" height="5.3" rx="1.6" fill="#141a24" stroke={OURO} strokeWidth="0.9" transform="rotate(-20 5.25 14.15)" />
              <rect x="6.55" y="6.5" width="2.3" height="3.3" rx="1" fill={OURO} />
              <rect x="9.35" y="6" width="2.3" height="3.7" rx="1" fill={OURO} />
              <rect x="12.15" y="6" width="2.3" height="3.7" rx="1" fill={OURO} />
              <rect x="14.95" y="6.5" width="2.3" height="3.3" rx="1" fill={OURO} />
              <line x1="9" y1="10.2" x2="9" y2="15.8" stroke={AZUL} strokeWidth="0.5" opacity="0.55" />
              <line x1="15" y1="10.2" x2="15" y2="15.8" stroke={AZUL} strokeWidth="0.5" opacity="0.55" />
              <circle cx="12" cy="12.6" r="2.3" fill={AZUL} opacity="0.3" />
              <circle cx="12" cy="12.6" r="1.05" fill={AZUL} />
            </svg>
          </div>

          <div
            style={es.miraZona}
            onPointerDown={miraInicio}
            onPointerMove={miraMover}
            onPointerUp={miraFim}
            onPointerCancel={miraFim}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div
              ref={miraBaseRef}
              style={{
                ...es.miraBase,
                transform:
                  miraOff.x || miraOff.y
                    ? 'translate(-50%, -50%) scale(1.06)'
                    : 'translate(-50%, -50%)',
              }}
            />
            <div
              style={{
                ...es.miraKnob,
                transform: `translate(calc(-50% + ${miraOff.x}px), calc(-50% + ${miraOff.y}px))`,
              }}
            />
          </div>

          {menuPausa && (
            <div
              className="armor-pause-overlay"
              onClick={() => setMenuPausa(false)}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div className="armor-pause-painel" onClick={(e) => e.stopPropagation()}>
                <p className="armor-pause-titulo">Pausado</p>
                <button className="armor-pause-btn" onClick={() => setMenuPausa(false)}>
                  Continuar
                </button>
                <button
                  className="armor-pause-btn sair"
                  onClick={() => {
                    setMenuPausa(false);
                    setFase('pronto');
                  }}
                >
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {fase === 'erro' && (
        <div style={es.overlay}>
          <p style={{ ...es.txtGrande, color: '#FF6B81' }}>FALHA AO CARREGAR</p>
          <p style={{ ...es.txtPeq, maxWidth: 280, textAlign: 'center', lineHeight: 1.6 }}>
            Verifica os links das sprites e do chão em sprites.js.
          </p>
        </div>
      )}

      {fase !== 'erro' && !paisagem && (
        <div style={es.overlay}>
          <div className="armor-rotate-phone" />
          <p style={es.txtRodar}>VIRE O CELULAR</p>
          <button onClick={sair} style={es.cancelarRodar}>
            Cancelar
          </button>
        </div>
      )}

      {fase === 'pronto' && (
        <div
          style={{ ...es.overlayVideo, display: fase === 'pronto' && paisagem ? 'block' : 'none' }}
          onClick={fase === 'pronto' ? entrarTelaCheia : undefined}
          onContextMenu={(e) => e.preventDefault()}
        >
          <video
            ref={videoIntroRef}
            style={es.videoIntro}
            src={videoIntroSrc || INTRO_SRC}
            muted
            playsInline
            preload="auto"
            onEnded={(e) => {
              const v = e.currentTarget;
              try {
                v.pause();
                if (isFinite(v.duration)) v.currentTime = Math.max(0, v.duration - 0.05);
              } catch (err) {}
            }}
          />

          {fase === 'pronto' && (
            <>
              {BOTOES_INICIO.map((b) => (
                <div
                  key={b.id}
                  ref={(el) => {
                    if (el) btnRefs.current[b.id] = el;
                  }}
                  data-armor-btn={b.id}
                  className="armor-menu-btn"
                  role="button"
                  aria-label={b.id}
                  onPointerDown={(e) => menuDown(e, b.id)}
                  onPointerMove={menuMove}
                  onPointerUp={menuUp}
                  onPointerCancel={menuUp}
                  onAnimationEnd={menuFimAnim}
                  onContextMenu={(e) => e.preventDefault()}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    left: `${b.cx}%`,
                    top: `${b.cy}%`,
                    width: `${b.w}%`,
                    aspectRatio: `${b.aspect}`,
                    backgroundImage: `url(${b.src})`,
                  }}
                />
              ))}

              <div style={es.perfilBox}>
                {fotoPerfil ? (
                  <img
                    src={fotoPerfil}
                    alt=""
                    style={es.perfilFotoImg}
                    onError={() => setFotoPerfil(null)}
                  />
                ) : (
                  <svg viewBox="0 0 64 64" style={es.perfilFoto} aria-hidden="true" focusable="false">
                    <circle cx="32" cy="23" r="13" fill="#FFFFFF" />
                    <path d="M8 57c0-13.3 10.7-20 24-20s24 6.7 24 20v3H8z" fill="#FFFFFF" />
                  </svg>
                )}
                <div style={es.perfilTxt}>
                  <span style={es.perfilNome}>{nomePiloto || 'Seu nome'}</span>
                  <span style={es.perfilNivel}>Nível {nivel}</span>
                </div>
              </div>
            </>
          )}

          {/* Overlay "Em Breve" centralizado com a paleta da UI */}
          {emBreve && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                color: '#F4F4F4',
                padding: '12px 30px',
                borderRadius: '8px',
                fontFamily: "ui-monospace, 'Courier New', monospace",
                fontSize: '22px',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                border: '1px solid rgba(244, 244, 244, 0.3)',
                zIndex: 9999,
                pointerEvents: 'none',
                textAlign: 'center',
                boxShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
              }}
            >
              Em breve
            </div>
          )}
        </div>
      )}

      {/* (5) renderiza o modal de configurações sobre a tela */}
      {mostrarConfig && (
        <Configuracoes
          onClose={() => setMostrarConfig(false)}
          estado={estadoRef.current}
          nivel={nivel}
          fotoPerfil={fotoPerfil}
          email={emailConta}
          onAplicarPref={aplicarPref}
          onPersistir={persistirEstado}
          onFotoAlterada={setFotoPerfil}
        />
      )}

      <style>{CSS_ARMOR}</style>
    </div>,
    document.body
  );
}