import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { carregarEstado, salvarEstado, estadoInicial } from '../lib/playerSave';
import { ALT, RENDER_SCALE, ZOOM_PERTO, AZUL } from './ajustes';
import { asset, BOTOES_INICIO } from './sprites';
import { calcularSol } from './mundo';
import { carregarSprites } from './carregarSprites';
import { criarLoop } from './render';
import { criarControles } from './controles';
import { es, CSS_ARMOR } from './estilos';

// ============================================================
// PROJETO ARMOR — Capítulo 1: O Despertar
// Componente/telas do jogo: carrega as sprites, controla as fases
// (carregando → tela inicial → jogando), monta o MOTOR (motor.js) e os
// CONTROLES (controles.js), e desenha a UI (vídeo da intro, botões, HUD).
// A física/desenho fica no motor; os ajustes em ajustes.js; as folhas de
// sprite em sprites.js. Guia completo em ESTRUTURA.md.
// ============================================================

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
  const btnRefs = useRef({});   // id do botão do menu → elemento (para acender/animar)
  // Estado do arrasto que gera a onda: botão inicial, botão atual sob o dedo e
  // se o dedo já "vagou" para outro botão (aí é gesto de onda, não um toque).
  const arrastoMenuRef = useRef({ ativo: false, atual: null, inicio: null, vagou: false });
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
  const imgsRef = useRef({ andar: null, correr: null, chao: null, pular: null, parado: null, calibAndar: null, calibCorrer: null, calibParado: null, calibPular: null, chaoCalib: null });
  const videoIntroRef = useRef(null);
  // Vídeo da intro baixado inteiro para a memória (blob) assim que o app abre:
  // quando o celular vira para paisagem, toca na hora, sem buffering de rede.
  const [videoIntroSrc, setVideoIntroSrc] = useState(null);
  const introTocouRef = useRef(false);
  // Guarda a orientação anterior para detectar a transição retrato→paisagem
  // (é o único gatilho que inicia o vídeo da intro).
  const prevPaisagemRef = useRef(false);
  // Joysticks (leitura entregue ao loop do jogo via refs).
  const moveRef = useRef({ x: 0, mag: 0 });   // mover: x = -1..1, mag = 0..1
  const joyBaseRef = useRef(null);
  const joyPointerRef = useRef(null);
  const aimRef = useRef({ active: false, ang: 0 }); // mirar: direção + se dispara
  const miraBaseRef = useRef(null);
  // Estado persistido no Supabase (prefs + estatísticas + progresso).
  const estadoRef = useRef(estadoInicial());
  const carregadoRef = useRef(false); // só salva depois que carregou (evita apagar)
  const miraPointerRef = useRef(null);

  // ---------- CARREGAMENTO DAS SPRITES (ver carregarSprites.js) ----------
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    let vivos = true;
    carregarSprites()
      .then((imgs) => { if (!vivos) return; imgsRef.current = imgs; setFase('pronto'); })
      .catch(() => vivos && setFase('erro'));
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
  // Ao abrir: carrega o estado salvo, reaplica as preferências, conta mais uma
  // sessão e regrava. A identificação do jogador é a sessão do Supabase Auth
  // compartilhada com a plataforma (ver lib/playerSave.js).
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
      tiroHeld: false, tiroCd: 0, missilQueued: false, missilCd: 0,
      projeteis: [], particulas: [],
    };
  };

  // Copia a posição atual do personagem (posição viva no loop) para o estado
  // persistido, antes de gravar. Sem partida ativa, não faz nada.
  const sincronizarPos = () => {
    const g = G.current;
    if (!g || !g.p || !estadoRef.current) return;
    estadoRef.current.pos = { x: g.p.x, y: g.p.y, face: g.p.face };
  };

  // ---------- LOOP PRINCIPAL (o cérebro: render.js) ----------
  useEffect(() => {
    if (fase !== 'jogando') return;
    initGame();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const loop = criarLoop({
      ctx, canvas, G, imgsRef, zoomAlvoRef, relogioAtivoRef, solRef, moveRef, aimRef,
    });
    loop.start();
    return () => loop.stop();
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

  // Alterna o zoom da câmera (perto/longe) e salva a preferência.
  const alternarZoom = () => {
    const novo = !zoomPerto; setZoomPerto(novo);
    zoomAlvoRef.current = novo ? ZOOM_PERTO : 1;
    estadoRef.current.prefs.zoomPerto = novo;
    if (carregadoRef.current) salvarEstado(estadoRef.current);
  };
  // Liga o relógio do mundo real (fase do dia no céu), pedindo a latitude.
  const ativarRelogio = () => {
    if (relogioAtivo) return;
    const aplicar = (lat) => {
      latRef.current = (typeof lat === 'number' && isFinite(lat)) ? lat : null;
      relogioAtivoRef.current = true; setRelogioAtivo(true);
      estadoRef.current.prefs.relogioAtivo = true;
      if (carregadoRef.current) salvarEstado(estadoRef.current);
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => aplicar(pos.coords.latitude), () => aplicar(null),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
      );
    } else aplicar(null);
  };

  // ---------- CONTROLES (joysticks + voar + onda do menu) ----------
  const {
    menuDown, menuMove, menuUp, menuFimAnim,
    joyInicio, joyMover, joyFim,
    voarPress, voarRelease,
    miraInicio, miraMover, miraFim,
  } = criarControles({
    setKnobOff, setMiraOff, setVoarAtivo,
    moveRef, aimRef, joyBaseRef, joyPointerRef, miraBaseRef, miraPointerRef,
    G, btnRefs, arrastoMenuRef, entrar, sair,
  });

  // ---------- REPRODUÇÃO DA INTRO ----------
  // A intro toca do começo (personagem surge do escuro) SOMENTE no momento em
  // que o celular vira para paisagem estando na tela inicial (transição
  // retrato→paisagem). Depois congela no último quadro (onEnded).
  useEffect(() => {
    if (fase !== 'pronto') return;         // só conta na tela inicial
    const was = prevPaisagemRef.current;
    prevPaisagemRef.current = paisagem;
    if (!paisagem || was) return;          // precisa ser a transição p/ paisagem
    const v = videoIntroRef.current;
    if (!v) return;
    introTocouRef.current = true;
    try { v.currentTime = 0; } catch (err) {}
    v.play().catch(() => {});
  }, [fase, paisagem]);

  // Pré-baixa o vídeo da intro para a memória assim que o app abre (em
  // paralelo com as sprites). Se o download terminar antes da intro tocar,
  // o <video> passa a usar o blob local → reprodução instantânea na virada
  // do celular, sem depender da rede. Se a intro já tocou, não troca o src
  // (trocaria o quadro congelado por tela preta).
  useEffect(() => {
    let vivo = true, url = null;
    fetch(asset('armor-intro.mp4?v=5'))
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('http'))))
      .then((b) => {
        if (!vivo || introTocouRef.current) return;
        url = URL.createObjectURL(b);
        setVideoIntroSrc(url);
      })
      .catch(() => {});   // sem blob, fica o src normal com preload="auto"
    return () => { vivo = false; if (url) URL.revokeObjectURL(url); };
  }, []);

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

          {/* Voltar: retorna para a tela inicial do próprio jogo. */}
          <button onClick={() => setFase('pronto')} style={es.voltar}>← Voltar</button>

          {/* Joystick de MOVER (esquerda): zona transparente capta o toque;
              base e knob ficam por cima sem capturar. */}
          <div
            style={es.joyZona}
            onPointerDown={joyInicio}
            onPointerMove={joyMover}
            onPointerUp={joyFim}
            onPointerCancel={joyFim}
            onContextMenu={(e) => e.preventDefault()}
          />
          <div
            ref={joyBaseRef}
            style={{ ...es.joyBase, transform: (knobOff.x || knobOff.y) ? 'translate(-50%,-50%) scale(1.06)' : 'translate(-50%,-50%)' }}
          />
          <div
            style={{ ...es.joyKnob, transform: `translate(calc(-50% + ${knobOff.x}px), calc(-50% + ${knobOff.y}px))` }}
          />

          {/* Botão de VOAR (direita) */}
          <img
            src={asset('botao-voar.webp')}
            alt="Voar"
            draggable={false}
            onPointerDown={voarPress}
            onPointerUp={voarRelease}
            onPointerCancel={voarRelease}
            onPointerLeave={voarRelease}
            onContextMenu={(e) => e.preventDefault()}
            style={{ ...es.botaoVoar, transform: `translate(-50%, -50%) scale(${voarAtivo ? 1.08 : 1})` }}
          />

          {/* Joystick de MIRAR (direita): zona transparente capta o toque;
              base e knob por cima. Enquanto mira, dispara sozinho. */}
          <div
            style={es.miraZona}
            onPointerDown={miraInicio}
            onPointerMove={miraMover}
            onPointerUp={miraFim}
            onPointerCancel={miraFim}
            onContextMenu={(e) => e.preventDefault()}
          />
          <div
            ref={miraBaseRef}
            style={{ ...es.miraBase, transform: (miraOff.x || miraOff.y) ? 'translate(-50%,-50%) scale(1.06)' : 'translate(-50%,-50%)' }}
          />
          <div
            style={{ ...es.miraKnob, transform: `translate(calc(-50% + ${miraOff.x}px), calc(-50% + ${miraOff.y}px))` }}
          />
        </>
      )}

      {fase === 'erro' && (
        <div style={es.overlay}>
          <p style={{ ...es.txtGrande, color: '#FF6B81' }}>FALHA AO CARREGAR</p>
          <p style={{ ...es.txtPeq, maxWidth: 280, textAlign: 'center', lineHeight: 1.6 }}>Verifica os links das sprites e do chão em sprites.js</p>
        </div>
      )}
      {fase !== 'erro' && !paisagem && (
        <div style={es.overlay}>
          <div className="armor-rotate-phone" />
          <p style={es.txtRodar}>VIRE O CELULAR</p>
          {/* Cancelar: volta para a Home (seção que abriu o jogo). */}
          <button onClick={sair} style={es.cancelarRodar}>Cancelar</button>
        </div>
      )}
      {fase !== 'erro' && (
        // O vídeo da tela inicial fica montado desde a abertura do app
        // (inclusive durante o carregamento das sprites), já baixando em
        // segundo plano; só aparece (display) na tela inicial em paisagem.
        // Assim, Jogar → Voltar retorna EXATAMENTE ao mesmo quadro pausado
        // (personagem de frente), sem recarregar nem recomeçar. A intro só
        // toca de novo quando o componente remonta (saiu para a Home e voltou).
        <div
          style={{ ...es.overlayVideo, display: fase === 'pronto' && paisagem ? 'block' : 'none' }}
          onClick={fase === 'pronto' ? entrarTelaCheia : undefined}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Vídeo do personagem. A reprodução é iniciada pelo useEffect da
              intro (só na virada para paisagem); aqui apenas congelamos no
              último quadro quando o vídeo termina. */}
          <video
            ref={videoIntroRef}
            style={es.videoIntro}
            src={videoIntroSrc || asset('armor-intro.mp4?v=5')}
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
          {/* Botões sobre o vídeo: invisíveis em repouso. Segurar e deslizar por
              eles gera uma onda (efeito piano) — cada botão acende, salta e
              desvanece em sequência. Um toque limpo aciona Jogar/Sair. */}
          {BOTOES_INICIO.map((b) => (
            <div
              key={b.id}
              ref={(el) => { if (el) btnRefs.current[b.id] = el; }}
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
          {/* Perfil do usuário no canto superior direito do vídeo. Tudo em
              código: a silhueta é um SVG (avatar genérico) e nome/nível são
              texto (Rajdhani). Não captura toque, então tocar aqui ainda
              entra em tela cheia. */}
          <div style={es.perfilBox}>
            <svg viewBox="0 0 64 64" style={es.perfilFoto} aria-hidden="true" focusable="false">
              {/* cabeça + ombros de um avatar genérico, branco */}
              <circle cx="32" cy="23" r="13" fill="#FFFFFF" />
              <path d="M8 57c0-13.3 10.7-20 24-20s24 6.7 24 20v3H8z" fill="#FFFFFF" />
            </svg>
            <div style={es.perfilTxt}>
              <span style={es.perfilNome}>Seu nome</span>
              <span style={es.perfilNivel}>Nível {nivel}</span>
            </div>
          </div>

            </>
          )}
        </div>
      )}

      <style>{CSS_ARMOR}</style>
    </div>,
    document.body
  );
}
