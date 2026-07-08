import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { carregarEstado, salvarEstado, estadoInicial } from '../lib/playerSave';
import { ALT, RENDERSCALE, ZOOM_PERTO, AZUL } from './ajustes';
import { asset, BOTOES_INICIO } from './sprites';
import { calcularSol } from './mundo';
import { carregarSprites } from './carregarSprites';
import { criarLoop } from './render';
import { criarControles } from './controles';
import { es, CSS_ARMOR } from './estilos';

function IconeRelogio({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export default function ProjetoArmor({ onVoltar }) {
  const [fase, setFase] = useState('carregando');
  const [zoomPerto, setZoomPerto] = useState(false);
  const [relogioAtivo, setRelogioAtivo] = useState(false);
  const [horaTexto, setHoraTexto] = useState('--:--');
  const [nivel, setNivel] = useState(0);

  const btnRefs = useRef({});
  const arrastoMenuRef = useRef({ ativo: false, atual: null, inicio: null, vagou: false });

  const [knobOff, setKnobOff] = useState({ x: 0, y: 0 });
  const [miraOff, setMiraOff] = useState({ x: 0, y: 0 });
  const [voarAtivo, setVoarAtivo] = useState(false);

  const [paisagem, setPaisagem] = useState(
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : true
  );

  // Estado para a mensagem "Em breve"
  const [emBreve, setEmBreve] = useState(false);
  const emBreveTimerRef = useRef(null);

  const canvasRef = useRef(null);
  const G = useRef(null);

  const zoomAlvoRef = useRef(1);
  const relogioAtivoRef = useRef(false);
  const solRef = useRef({ sr: 6.5, ss: 18.5 });
  const latRef = useRef(null);

  const imgsRef = useRef({
    andar: null,
    correr: null,
    chao: null,
    pular: null,
    parado: null,
    calibAndar: null,
    calibCorrer: null,
    calibParado: null,
    calibPular: null,
    chaoCalib: null,
  });

  const videoIntroRef = useRef(null);
  const [videoIntroSrc, setVideoIntroSrc] = useState(null);
  const introTocouRef = useRef(false);
  const prevPaisagemRef = useRef(false);

  const moveRef = useRef({ x: 0, mag: 0 });
  const joyBaseRef = useRef(null);
  const joyPointerRef = useRef(null);

  const aimRef = useRef({ active: false, ang: 0 });
  const miraBaseRef = useRef(null);
  const miraPointerRef = useRef(null);

  const estadoRef = useRef(estadoInicial);
  const carregadoRef = useRef(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    let vivos = true;

    carregarSprites()
      .then((imgs) => {
        if (!vivos) return;
        imgsRef.current = imgs;
        setFase('pronto');
      })
      .catch(() => {
        if (!vivos) return;
        setFase('erro');
      });

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
        c.height = ALT * RENDERSCALE;
        c.width = Math.max(480, Math.round((ALT * ww) / wh) * RENDERSCALE);
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
        zoomAlvoRef.current = ZOOMPERTO;
      }

      if (est.prefs.relogioAtivo) {
        relogioAtivoRef.current = true;
        setRelogioAtivo(true);
      }

      setNivel(est.progresso.nivel || 0);
      estadoRef.current = est;
      carregadoRef.current = true;
      await salvarEstado(est);
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

      const nv = Math.floor(est.stats.tempoJogadoSeg / 120);
      if (nv !== est.progresso.nivel) {
        est.progresso.nivel = nv;
        est.progresso.xp = est.stats.tempoJogadoSeg;
        setNivel(nv);
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
    const px = typeof salvo.x === 'number' ? salvo.x : 260;
    const py = typeof salvo.y === 'number' ? salvo.y : 0;
    const face = salvo.face === -1 ? -1 : 1;

    G.current = {
      p: { x: px, y: py, vx: 0, vy: 0, face, animT: 0, modo: 'parado' },
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
      missilQueued: false,
      missilCd: 0,
      projeteis: [],
      particulas: [],
    };
  };

  useEffect(() => {
    if (fase !== 'jogando') return;
    initGame();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const loop = criarLoop(
      ctx,
      canvas,
      G,
      imgsRef,
      zoomAlvoRef,
      relogioAtivoRef,
      solRef,
      moveRef,
      aimRef
    );

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

  // Alterna o zoom da câmera (perto/longe) e salva a preferência.
  const alternarZoom = () => {
    const novo = !zoomPerto;
    setZoomPerto(novo);
    zoomAlvoRef.current = novo ? ZOOMPERTO : 1;
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
    miraInicio,
    miraMover,
    miraFim,
  } = criarControles({
    setKnobOff,
    setMiraOff,
    setVoarAtivo,
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

    fetch(asset('armor-intro.mp4?v5'))
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
    <div style={es.fundo}>
      <canvas ref={canvasRef} className="armor-canvas" style={es.canvas} />

      {fase === 'jogando' && paisagem && (
        <div>
          <div style={{ ...es.barra, top: 0 }} />
          <div style={{ ...es.barra, bottom: 0 }} />

          <button onClick={alternarZoom} style={es.botaoZoom} title="Alternar câmera">
            <span style={{ fontSize: 17, lineHeight: '17px' }}>{zoomPerto ? '—' : '+'}</span>
            <span style={{ fontSize: 7, letterSpacing: '0.1em', marginTop: 2 }}>
              {zoomPerto ? 'LONGE' : 'PERTO'}
            </span>
          </button>

          <button onClick={ativarRelogio} style={es.botaoRelogio} title="Relógio do mundo real">
            <span style={{ display: 'flex', alignItems: 'center', color: relogioAtivo ? AZUL : '#8E8E93' }}>
              <IconeRelogio />
            </span>
            <span style={{ marginLeft: 6, fontSize: 12, letterSpacing: '0.08em', color: relogioAtivo ? '#DCE8FF' : '#8E8E93' }}>
              {relogioAtivo ? horaTexto : 'ATIVAR'}
            </span>
          </button>

          <button onClick={() => setFase('pronto')} style={es.voltar}>
            Voltar
          </button>

          <div style={es.joyZona} onPointerDown={joyInicio} onPointerMove={joyMover} onPointerUp={joyFim} onPointerCancel={joyFim} onContextMenu={(e) => e.preventDefault()}>
            <div ref={joyBaseRef} style={{ ...es.joyBase, transform: knobOff.x || knobOff.y ? 'translate(-50%, -50%) scale(1.06)' : 'translate(-50%, -50%)' }} />
            <div style={{ ...es.joyKnob, transform: `translate(calc(-50% + ${knobOff.x}px), calc(-50% + ${knobOff.y}px))` }} />
          </div>

          <img
            src={asset('botao-voar.webp')}
            alt="Voar"
            draggable="false"
            onPointerDown={voarPress}
            onPointerUp={voarRelease}
            onPointerCancel={voarRelease}
            onPointerLeave={voarRelease}
            onContextMenu={(e) => e.preventDefault()}
            style={{ ...es.botaoVoar, transform: `translate(-50%, -50%) scale(${voarAtivo ? 1.08 : 1})` }}
          />

          <div style={es.miraZona} onPointerDown={miraInicio} onPointerMove={miraMover} onPointerUp={miraFim} onPointerCancel={miraFim} onContextMenu={(e) => e.preventDefault()}>
            <div ref={miraBaseRef} style={{ ...es.miraBase, transform: miraOff.x || miraOff.y ? 'translate(-50%, -50%) scale(1.06)' : 'translate(-50%, -50%)' }} />
            <div style={{ ...es.miraKnob, transform: `translate(calc(-50% + ${miraOff.x}px), calc(-50% + ${miraOff.y}px))` }} />
          </div>
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
          <div className="armor-rotate-phone">
            <p style={es.txtRodar}>VIRE O CELULAR</p>
            <button onClick={sair} style={es.cancelarRodar}>
              Cancelar
            </button>
          </div>
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
            src={videoIntroSrc || asset('armor-intro.mp4?v5')}
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
              {BOTOESINICIO.map((b) => (
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
                    left: b.cx,
                    top: b.cy,
                    width: b.w,
                    aspectRatio: b.aspect,
                    backgroundImage: `url(${b.src})`,
                  }}
                />
              ))}

              <div style={es.perfilBox}>
                <svg viewBox="0 0 64 64" style={es.perfilFoto} aria-hidden="true" focusable="false">
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

      <style>{CSS_ARMOR}</style>
    </div>,
    document.body
  );
}