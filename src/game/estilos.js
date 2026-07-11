// ============================================================
// PROJETO ARMOR · ESTILOS (visual das telas, HUD e animações)
// `es`  = estilos inline dos elementos (fundo, canvas, joysticks, botões,
//         overlays, perfil…). CSS_ARMOR = as animações (girar o celular,
//         onda/efeito piano dos botões do menu) e o pixelado do canvas.
// Só aparência — nenhuma lógica de jogo aqui.
// ============================================================

// CSS injetado via <style> no componente (animações e image-rendering).
export const CSS_ARMOR = `
  .armor-canvas { image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; image-rendering: pixelated; }
  /* Animação "VIRE O CELULAR" */
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
  /* --- Botões do menu inicial: onda / efeito piano ao deslizar --- */
  .armor-menu-btn {
    position:absolute;
    background-size:contain; background-position:center; background-repeat:no-repeat;
    transform-origin:center; transform:translate(-50%,-50%) scale(1);
    opacity:0; z-index:3; cursor:pointer;
    user-select:none; -webkit-user-select:none; -webkit-touch-callout:none;
    touch-action:none; will-change:transform,opacity,filter;
    transition:transform .12s ease, opacity .12s ease, filter .12s ease;
  }
  .armor-menu-btn.is-ativo {
    opacity:1; transform:translate(-50%,-50%) scale(1.28);
    filter:drop-shadow(0 0 9px rgba(96,199,255,.95)) drop-shadow(0 0 20px rgba(56,150,255,.55));
    transition:transform .08s ease-out, opacity .08s ease-out, filter .08s ease-out;
  }
  .armor-menu-btn.is-onda { animation:armorOnda .5s cubic-bezier(.2,.9,.25,1) forwards; }
  @keyframes armorOnda {
    0%   { opacity:1; transform:translate(-50%,-50%) scale(1.28);
           filter:drop-shadow(0 0 9px rgba(96,199,255,.95)) drop-shadow(0 0 20px rgba(56,150,255,.55)); }
    30%  { opacity:1; transform:translate(-50%,-50%) scale(1.44);
           filter:drop-shadow(0 0 16px rgba(130,220,255,1)) drop-shadow(0 0 30px rgba(56,150,255,.75)); }
    100% { opacity:0; transform:translate(-50%,-50%) scale(1.05);
           filter:drop-shadow(0 0 0 rgba(96,199,255,0)) drop-shadow(0 0 0 rgba(56,150,255,0)); }
  }

  /* === JOYSTICKS FUTURISTAS === */
  .joy-base-layer {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    will-change: transform;
  }

  .joy-core {
    position: absolute;
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .joy-glow-ring-1 { border: 1px solid rgba(130, 200, 255, 0.15); }
  .joy-glow-ring-2 { border: 1.5px solid rgba(96, 180, 255, 0.25); }
  .joy-glow-ring-3 { border: 0.5px solid rgba(130, 220, 255, 0.35); }

  .joy-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, rgba(130, 200, 255, 0.4), rgba(96, 180, 255, 0.15), transparent);
    box-shadow:
      inset 0 0 20px rgba(130, 200, 255, 0.2),
      inset 0 2px 10px rgba(255, 255, 255, 0.1),
      0 0 15px rgba(130, 200, 255, 0.3);
  }

  .joy-knob {
    position: absolute;
    border-radius: 50%;
    top: 50%;
    left: 50%;
    pointer-events: none;
    will-change: transform;
    background: radial-gradient(circle at 30% 30%, rgba(130, 220, 255, 0.6), rgba(96, 180, 255, 0.25), rgba(60, 140, 200, 0.1));
    box-shadow:
      0 0 12px rgba(130, 200, 255, 0.5),
      0 0 24px rgba(96, 180, 255, 0.3),
      inset 0 -2px 8px rgba(0, 0, 0, 0.3),
      inset 0 2px 6px rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(130, 220, 255, 0.6);
  }

  .joy-knob-inner {
    position: absolute;
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle at 35% 35%, rgba(180, 230, 255, 0.8), rgba(100, 180, 255, 0.2));
    box-shadow:
      inset 0 1px 4px rgba(255, 255, 255, 0.4),
      0 0 8px rgba(130, 220, 255, 0.6);
  }

  @keyframes joyPulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.8; }
  }

  .joy-pulse { animation: joyPulse 3s ease-in-out infinite; }

  /* === BOTÕES DE AÇÃO (Pular / Lutar) — mesmo idioma visual dos joysticks:
     vidro translúcido, brilho difuso, sem nenhuma imagem. === */
  .armor-action-btn {
    position: absolute;
    border-radius: 50%;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    backdrop-filter: blur(0.5px);
    transition: box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease;
  }
  .armor-action-btn svg { width: 42%; height: 42%; }

  .armor-action-btn.is-voar {
    background: radial-gradient(circle at 32% 32%, rgba(130,210,255,0.16) 0%, rgba(60,140,200,0.05) 55%, transparent 100%);
    border: 1px solid rgba(130,200,255,0.3);
    color: rgba(190,230,255,0.8);
    box-shadow:
      0 0 16px rgba(130,200,255,0.18),
      inset 0 0 18px rgba(130,200,255,0.06),
      inset 0 1px 2px rgba(255,255,255,0.06);
  }
  .armor-action-btn.is-voar.is-ativo {
    background: radial-gradient(circle at 32% 32%, rgba(160,225,255,0.38) 0%, rgba(80,170,230,0.12) 55%, transparent 100%);
    border-color: rgba(190,230,255,0.8);
    color: #eaf8ff;
    box-shadow:
      0 0 20px rgba(130,210,255,0.55),
      0 0 42px rgba(96,180,255,0.32),
      inset 0 0 20px rgba(160,220,255,0.16);
  }

  .armor-action-btn.is-lutar {
    background: radial-gradient(circle at 32% 32%, rgba(255,200,110,0.16) 0%, rgba(200,140,50,0.05) 55%, transparent 100%);
    border: 1px solid rgba(240,192,64,0.32);
    color: rgba(255,214,140,0.82);
    box-shadow:
      0 0 16px rgba(240,192,64,0.16),
      inset 0 0 18px rgba(240,192,64,0.06),
      inset 0 1px 2px rgba(255,255,255,0.06);
  }
  .armor-action-btn.is-lutar.is-ativo {
    background: radial-gradient(circle at 32% 32%, rgba(255,216,140,0.42) 0%, rgba(220,160,60,0.12) 55%, transparent 100%);
    border-color: rgba(255,222,150,0.85);
    color: #fff3da;
    box-shadow:
      0 0 20px rgba(240,192,64,0.55),
      0 0 42px rgba(240,170,50,0.32),
      inset 0 0 20px rgba(255,210,120,0.16);
  }
`;

export const es = {
  fundo: { position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 999999, overflow: 'hidden', touchAction: 'none' },
  canvas: { width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated', touchAction: 'none' },
  barra: { position: 'absolute', left: 0, width: '100%', height: 22, backgroundColor: '#000', zIndex: 5, pointerEvents: 'none' },
  botaoZoom: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 42, height: 46, borderRadius: 14, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.14)', color: '#8E8E93', cursor: 'pointer', zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' },
  botaoRelogio: { position: 'absolute', top: 30, right: 16, display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 20, padding: '6px 12px', cursor: 'pointer', zIndex: 30, fontFamily: 'monospace' },
  voltar: { position: 'absolute', top: 30, left: 16, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, color: '#8E8E93', fontSize: 13, padding: '6px 13px', cursor: 'pointer', zIndex: 30 },
  
  // ----- HUD por imagem: joysticks de mover/mirar + botão de voar -----
  joyZona: { position: 'absolute', left: 0, bottom: 0, width: '50%', top: '22%', zIndex: 25, touchAction: 'none', background: 'transparent' },

  // FUTURISTA: Joystick de MOVER com design cinematográfico transparente
  // (mais para dentro da tela — antes ficava com metade do círculo cortada
  // pela borda esquerda em telas mais estreitas)
  joyBase: {
    position: 'absolute', left: '21%', top: '78.1%', width: 'clamp(90px,13.5vw,150px)', aspectRatio: '1',
    transform: 'translate(-50%,-50%)', pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none',
    zIndex: 26, boxSizing: 'border-box', borderRadius: '50%',
    background: 'radial-gradient(circle at center, rgba(130, 200, 255, 0.05) 0%, rgba(60, 120, 180, 0.02) 70%, transparent 100%)',
    backdropFilter: 'blur(0.5px)',
    border: '1px solid rgba(130, 200, 255, 0.15)',
    boxShadow: `
      0 0 20px rgba(130, 200, 255, 0.15),
      0 0 40px rgba(96, 180, 255, 0.08),
      inset 0 0 30px rgba(130, 200, 255, 0.05),
      inset 0 1px 2px rgba(255, 255, 255, 0.05)
    `,
    transition: 'transform 0.12s ease, box-shadow 0.12s ease'
  },

  joyKnob: {
    position: 'absolute', left: '21%', top: '78.1%', width: 'clamp(38px,5.6vw,62px)', aspectRatio: '1',
    pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none', zIndex: 27,
    transition: 'transform 0.07s ease-out',
    boxSizing: 'border-box', borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, rgba(180, 230, 255, 0.7) 0%, rgba(130, 200, 255, 0.3) 40%, rgba(60, 140, 200, 0.1) 100%)',
    border: '1px solid rgba(180, 230, 255, 0.8)',
    boxShadow: `
      0 0 12px rgba(130, 200, 255, 0.6),
      0 0 24px rgba(96, 180, 255, 0.4),
      0 0 40px rgba(130, 200, 255, 0.2),
      inset 0 -2px 8px rgba(0, 0, 0, 0.2),
      inset 0 2px 6px rgba(255, 255, 255, 0.2)
    `
  },
  
  // Botões de ação (Pular/Lutar): posicionados entre os dois joysticks, um
  // pouco acima da linha deles, formando um par diagonal — igual ao padrão
  // de jogos de ação mobile. Estilo visual vem da classe .armor-action-btn
  // (CSS_ARMOR); aqui só posição/tamanho.
  botaoVoar: { position: 'absolute', left: '67%', top: '86%', width: 'clamp(50px,7.3vw,80px)', aspectRatio: '1', transformOrigin: 'center', transition: 'transform 0.1s ease', zIndex: 28 },
  botaoLutar: { position: 'absolute', left: '58%', top: '70%', width: 'clamp(46px,6.6vw,72px)', aspectRatio: '1', transformOrigin: 'center', transition: 'transform 0.1s ease', zIndex: 28 },
  miraZona: { position: 'absolute', left: '50%', top: '22%', right: 0, bottom: 0, zIndex: 25, touchAction: 'none', background: 'transparent' },

  // FUTURISTA: Joystick de MIRAR com design cinematográfico transparente
  // (mais para dentro da tela — antes ficava com metade do círculo cortada
  // pela borda direita em telas mais estreitas)
  miraBase: {
    position: 'absolute', left: '79%', top: '80.9%', width: 'clamp(90px,13.5vw,150px)', aspectRatio: '1',
    transform: 'translate(-50%,-50%)', pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none',
    zIndex: 26, boxSizing: 'border-box', borderRadius: '50%',
    background: 'radial-gradient(circle at center, rgba(130, 200, 255, 0.05) 0%, rgba(60, 120, 180, 0.02) 70%, transparent 100%)',
    backdropFilter: 'blur(0.5px)',
    border: '1px solid rgba(130, 200, 255, 0.15)',
    boxShadow: `
      0 0 20px rgba(130, 200, 255, 0.15),
      0 0 40px rgba(96, 180, 255, 0.08),
      inset 0 0 30px rgba(130, 200, 255, 0.05),
      inset 0 1px 2px rgba(255, 255, 255, 0.05)
    `,
    transition: 'transform 0.12s ease, box-shadow 0.12s ease'
  },

  miraKnob: {
    position: 'absolute', left: '79%', top: '80.9%', width: 'clamp(48px,7.1vw,80px)', aspectRatio: '1',
    pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none', zIndex: 27,
    transition: 'transform 0.04s ease-out',
    boxSizing: 'border-box', borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, rgba(180, 230, 255, 0.7) 0%, rgba(130, 200, 255, 0.3) 40%, rgba(60, 140, 200, 0.1) 100%)',
    border: '1px solid rgba(180, 230, 255, 0.8)',
    boxShadow: `
      0 0 12px rgba(130, 200, 255, 0.6),
      0 0 24px rgba(96, 180, 255, 0.4),
      0 0 40px rgba(130, 200, 255, 0.2),
      inset 0 -2px 8px rgba(0, 0, 0, 0.2),
      inset 0 2px 6px rgba(255, 255, 255, 0.2)
    `
  },
  
  overlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20, backdropFilter: 'blur(4px)', fontFamily: 'monospace' },
  txtRodar: { color: '#7dd3fc', fontSize: 'clamp(20px,6vw,30px)', fontWeight: 700, letterSpacing: '2px', textShadow: '2px 2px 0 #0a3d62', margin: 0 },
  cancelarRodar: { marginTop: 28, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(125,211,252,0.4)', borderRadius: 22, color: '#7dd3fc', fontFamily: 'monospace', fontSize: 15, fontWeight: 700, letterSpacing: '1px', padding: '9px 26px', cursor: 'pointer' },
  txtGrande: { color: '#F0C040', fontSize: 19, fontWeight: 700, letterSpacing: '0.18em', margin: '0 0 8px' },
  txtPeq: { color: '#8E8E93', fontSize: 12, letterSpacing: '0.1em', margin: 0 },
  videoIntro: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, backgroundColor: '#000' },
  overlayVideo: { position: 'absolute', inset: 0, zIndex: 20, overflow: 'hidden', cursor: 'pointer' },
  perfilBox: { position: 'absolute', left: '72%', top: '3.6%', width: '20.5%', height: '17%', display: 'flex', alignItems: 'center', boxSizing: 'border-box', zIndex: 3, pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none', fontFamily: "'Rajdhani', sans-serif" },
  perfilFoto: { position: 'absolute', left: '14.5%', top: '50%', transform: 'translate(-50%, -50%)', height: '82%', aspectRatio: '1', objectFit: 'contain', filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.55))' },
  // Foto de perfil real (vinda da conta AlpsPrime): mesma posição/tamanho do
  // ícone de silhueta, só que recortada em círculo e preenchendo o quadro.
  perfilFotoImg: { position: 'absolute', left: '14.5%', top: '50%', transform: 'translate(-50%, -50%)', height: '82%', aspectRatio: '1', objectFit: 'cover', borderRadius: '50%', boxShadow: '0 0 0 2px rgba(255,255,255,0.85), 0 1px 5px rgba(0,0,0,0.55)' },
  perfilTxt: { display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.12, minWidth: 0, marginLeft: '40%' },
  perfilNome: { color: '#FFFFFF', fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: 'clamp(12px,2.3vw,28px)', letterSpacing: '0.01em', whiteSpace: 'nowrap', textShadow: '0 1px 5px rgba(0,0,0,0.7)' },
  perfilNivel: { color: '#FFFFFF', fontFamily: "'Rajdhani', sans-serif", fontWeight: 500, fontSize: 'clamp(11px,2.0vw,24px)', letterSpacing: '0.01em', whiteSpace: 'nowrap', textShadow: '0 1px 5px rgba(0,0,0,0.7)' },
};