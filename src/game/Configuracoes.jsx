import React, { useState, useRef, useEffect } from "react";

// ============================================================
// PROJETO ARMOR · PAINEL DE CONFIGURAÇÕES (HUD em paisagem)
// Recriação do layout de referência: cabeçalho com "voltar" + título, coluna
// esquerda (perfil, idioma, e-mail, vibração) e coluna direita (volumes).
//
// Não fala com o banco direto: recebe do ProjetoArmor.jsx o estado atual e
// callbacks:
//   • onAplicarPref(chave, valor) → aplica a preferência em memória (efeito ao
//     vivo: nome no perfil, vibração no tiro etc.)
//   • onPersistir()               → grava o estado no Supabase (upsert)
// ============================================================

const CIANO = "#43E5FF";
const CIANO_SUAVE = "rgba(67,229,255,0.28)";

// ---------------- ÍCONES (SVG inline, traço ciano) ----------------
const Ico = {
  voltar: (s = 30) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={CIANO} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  ),
  lapis: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={CIANO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  ),
  globo: (s = 26) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={CIANO} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
    </svg>
  ),
  envelope: (s = 26) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={CIANO} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M3 6.5l9 6 9-6" />
    </svg>
  ),
  cadeado: (s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={CIANO} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  ),
  vibrar: (s = 26) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={CIANO} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="3" width="8" height="18" rx="2" />
      <path d="M4 8v8M20 8v8" />
    </svg>
  ),
  camera: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  ),
  musica: (s = 30) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={CIANO} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </svg>
  ),
  efeitos: (s = 30) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={CIANO} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8 8 0 0 1 0 12" />
    </svg>
  ),
};

// ---------------- Interruptor (toggle) ----------------
function Interruptor({ ativo, onClick }) {
  return (
    <button onClick={onClick} aria-pressed={ativo} style={estilos.toggle(ativo)}>
      <span style={estilos.toggleKnob(ativo)} />
    </button>
  );
}

// ---------------- Slider de volume (trilho preenchido + knob) ----------------
function SliderVolume({ valor, onInput, onCommit }) {
  const pct = Math.max(0, Math.min(100, valor));
  const fundo = `linear-gradient(90deg, ${CIANO} 0%, ${CIANO} ${pct}%, rgba(255,255,255,0.14) ${pct}%, rgba(255,255,255,0.14) 100%)`;
  return (
    <div style={estilos.sliderLinha}>
      <input
        type="range"
        min={0}
        max={100}
        value={valor}
        onChange={(e) => onInput(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        className="armor-cfg-range"
        style={{ background: fundo }}
      />
      <span style={estilos.sliderPct}>{pct}%</span>
    </div>
  );
}

export default function Configuracoes({
  onClose,
  estado,
  nivel = 0,
  fotoPerfil = null,
  email = null,
  onAplicarPref = () => {},
  onPersistir = () => {},
}) {
  const prefs = (estado && estado.prefs) || {};

  const [nome, setNome] = useState(prefs.nomePiloto || "");
  const [idioma, setIdioma] = useState(prefs.idioma || "pt-BR");
  const [vibracao, setVibracao] = useState(prefs.vibracao !== false);
  const [volMusica, setVolMusica] = useState(
    typeof prefs.volumeMusica === "number" ? prefs.volumeMusica : 70
  );
  const [volEfeitos, setVolEfeitos] = useState(
    typeof prefs.volumeEfeitos === "number" ? prefs.volumeEfeitos : 85
  );

  // Escudo de 1 toque: o gesto que ABRE o painel (soltar o dedo no botão do
  // menu) dispara um "click" residual logo depois, já com o painel na tela —
  // esse escudo engole esse primeiro clique pra ele não acionar um controle
  // sem querer. Some sozinho após o resíduo (ou 350ms).
  const [escudo, setEscudo] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setEscudo(false), 350);
    return () => clearTimeout(t);
  }, []);

  // Bip de feedback (Web Audio) com volume proporcional ao "Volume dos efeitos".
  const audioRef = useRef(null);
  const beep = (vol = volEfeitos, freq = 620) => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioRef.current) audioRef.current = new AC();
      const ac = audioRef.current;
      if (ac.state === "suspended") ac.resume();
      const g = ac.createGain();
      const o = ac.createOscillator();
      o.type = "sine";
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
  };

  const persistir = () => onPersistir();

  const mudarNome = (v) => {
    const limpo = v.slice(0, 18);
    setNome(limpo);
    onAplicarPref("nomePiloto", limpo);
  };

  const mudarIdioma = (v) => {
    setIdioma(v);
    onAplicarPref("idioma", v);
    persistir();
  };

  const alternarVibracao = () => {
    const novo = !vibracao;
    setVibracao(novo);
    onAplicarPref("vibracao", novo);
    if (novo && navigator.vibrate) navigator.vibrate(25);
    persistir();
  };

  const mudarVolMusica = (v) => {
    setVolMusica(v);
    onAplicarPref("volumeMusica", v);
  };
  const mudarVolEfeitos = (v) => {
    setVolEfeitos(v);
    onAplicarPref("volumeEfeitos", v);
  };

  const irParaFoto = () => {
    // A foto é gerenciada no Perfil da plataforma AlpsPrime (mesma origem).
    try {
      window.location.href = "/profile";
    } catch {}
  };

  const fechar = () => {
    beep(volEfeitos, 480);
    persistir();
    onClose();
  };

  const inicial = (nome.trim()[0] || "").toUpperCase();

  return (
    <div style={estilos.tela}>
      {escudo && (
        <div
          style={estilos.escudo}
          onClickCapture={(e) => {
            e.stopPropagation();
            setEscudo(false);
          }}
          onPointerDownCapture={(e) => e.stopPropagation()}
        />
      )}

      <div style={estilos.moldura}>
        {/* cantos de HUD */}
        <span style={{ ...estilos.canto, top: 10, left: 10 }} />
        <span style={{ ...estilos.canto, top: 10, right: 10, transform: "scaleX(-1)" }} />
        <span style={{ ...estilos.canto, bottom: 10, left: 10, transform: "scaleY(-1)" }} />
        <span style={{ ...estilos.canto, bottom: 10, right: 10, transform: "scale(-1)" }} />

        {/* ---------- CABEÇALHO ---------- */}
        <div style={estilos.header}>
          <button style={estilos.voltar} onClick={fechar} aria-label="Voltar">
            {Ico.voltar()}
          </button>
          <h1 style={estilos.titulo}>CONFIGURAÇÕES</h1>
          <div style={estilos.circuito}>
            <span style={estilos.circuitoLinha} />
            <span style={estilos.circuitoNo} />
            <span style={{ ...estilos.circuitoNo, opacity: 0.5 }} />
          </div>
        </div>

        {/* ---------- CORPO (duas colunas) ---------- */}
        <div style={estilos.corpo}>
          {/* ===== COLUNA ESQUERDA ===== */}
          <div style={estilos.painel}>
            {/* Perfil */}
            <div style={estilos.perfil}>
              <div style={estilos.avatarWrap}>
                <div style={estilos.avatarRing}>
                  {fotoPerfil ? (
                    <img src={fotoPerfil} alt="" style={estilos.avatarImg} />
                  ) : (
                    <svg width="60" height="60" viewBox="0 0 64 64">
                      <circle cx="32" cy="24" r="13" fill={CIANO} />
                      <path d="M10 57c0-13 10-19 22-19s22 6 22 19" fill="none" stroke={CIANO} strokeWidth="5" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <button style={estilos.cameraBadge} onClick={irParaFoto} aria-label="Trocar foto">
                  {Ico.camera(20)}
                </button>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={estilos.nomeLinha}>
                  <input
                    value={nome}
                    onChange={(e) => mudarNome(e.target.value)}
                    onBlur={persistir}
                    placeholder="SEU NOME"
                    style={estilos.nomeInput}
                    maxLength={18}
                  />
                  <span style={estilos.lapisBtn}>{Ico.lapis(22)}</span>
                </div>
                <div style={estilos.nivelBadge}>NÍVEL {nivel}</div>
              </div>
            </div>

            {/* Idioma */}
            <div style={estilos.linha}>
              <span style={estilos.linhaIcone}>{Ico.globo()}</span>
              <span style={estilos.linhaLabel}>Idioma</span>
              <div style={estilos.selectWrap}>
                <select
                  value={idioma}
                  onChange={(e) => mudarIdioma(e.target.value)}
                  style={estilos.select}
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
                <span style={estilos.chevron}>▾</span>
              </div>
            </div>

            {/* E-mail */}
            <div style={estilos.linha}>
              <span style={estilos.linhaIcone}>{Ico.envelope()}</span>
              <span style={estilos.linhaLabel}>E-mail da conta</span>
              <span style={estilos.emailValor}>{email || "seuemail@exemplo.com"}</span>
              <span style={estilos.cadeado}>{Ico.cadeado(20)}</span>
            </div>

            {/* Vibração */}
            <div style={estilos.linha}>
              <span style={estilos.linhaIcone}>{Ico.vibrar()}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={estilos.linhaLabel}>Vibração ao atirar/acertar</div>
                <div style={estilos.linhaSub}>Sinta cada disparo e cada acerto.</div>
              </div>
              <Interruptor ativo={vibracao} onClick={alternarVibracao} />
            </div>
          </div>

          {/* ===== COLUNA DIREITA ===== */}
          <div style={estilos.colDireita}>
            <div style={estilos.cardVolume}>
              <span style={estilos.hexIcone}>{Ico.musica()}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={estilos.volTitulo}>Volume da música</div>
                <SliderVolume
                  valor={volMusica}
                  onInput={mudarVolMusica}
                  onCommit={persistir}
                />
              </div>
            </div>

            <div style={estilos.cardVolume}>
              <span style={estilos.hexIcone}>{Ico.efeitos()}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={estilos.volTitulo}>Volume dos efeitos</div>
                <SliderVolume
                  valor={volEfeitos}
                  onInput={mudarVolEfeitos}
                  onCommit={() => {
                    beep(volEfeitos);
                    persistir();
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
@keyframes armorCfgEntrada {
  from { opacity: 0; transform: scale(0.985); }
  to { opacity: 1; transform: scale(1); }
}
.armor-cfg-range {
  -webkit-appearance: none; appearance: none;
  height: 6px; border-radius: 6px; outline: none; cursor: pointer;
}
.armor-cfg-range::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 22px; height: 22px; border-radius: 50%;
  background: ${CIANO}; border: 3px solid #eafcff;
  box-shadow: 0 0 12px ${CIANO}, 0 0 4px ${CIANO};
  cursor: pointer;
}
.armor-cfg-range::-moz-range-thumb {
  width: 20px; height: 20px; border-radius: 50%;
  background: ${CIANO}; border: 3px solid #eafcff;
  box-shadow: 0 0 12px ${CIANO}; cursor: pointer;
}
`;

const estilos = {
  tela: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background:
      "radial-gradient(120% 120% at 50% 0%, #0a1a28 0%, #050b12 55%, #02060a 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "clamp(6px, 1.6vw, 20px)",
    boxSizing: "border-box",
    fontFamily: "'Rajdhani', 'Segoe UI', sans-serif",
    animation: "armorCfgEntrada .25s ease",
  },
  escudo: { position: "absolute", inset: 0, zIndex: 20 },
  moldura: {
    position: "relative",
    width: "100%",
    maxWidth: 1180,
    height: "100%",
    maxHeight: 640,
    boxSizing: "border-box",
    border: `1.5px solid ${CIANO_SUAVE}`,
    borderRadius: 18,
    background:
      "linear-gradient(160deg, rgba(10,26,40,0.55), rgba(4,10,18,0.75))",
    boxShadow:
      "0 0 40px rgba(67,229,255,0.15), inset 0 0 30px rgba(67,229,255,0.04)",
    padding: "clamp(10px, 2.4vmin, 28px)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  canto: {
    position: "absolute",
    width: 20,
    height: 20,
    borderTop: `2px solid ${CIANO}`,
    borderLeft: `2px solid ${CIANO}`,
    opacity: 0.85,
    pointerEvents: "none",
  },

  // Cabeçalho
  header: {
    display: "flex",
    alignItems: "center",
    gap: "clamp(12px, 2vw, 26px)",
    marginBottom: "clamp(8px, 2vmin, 22px)",
    flexShrink: 0,
  },
  voltar: {
    width: 52,
    height: 46,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(67,229,255,0.06)",
    border: `1.5px solid ${CIANO_SUAVE}`,
    borderRadius: 12,
    cursor: "pointer",
    clipPath:
      "polygon(22% 0, 100% 0, 100% 78%, 78% 100%, 0 100%, 0 22%)",
  },
  titulo: {
    margin: 0,
    color: "#eafcff",
    fontSize: "clamp(24px, 3.6vw, 44px)",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textShadow: `0 0 18px rgba(67,229,255,0.5)`,
    whiteSpace: "nowrap",
  },
  circuito: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  circuitoLinha: {
    flex: 1,
    height: 1,
    background: `linear-gradient(90deg, ${CIANO_SUAVE}, transparent)`,
  },
  circuitoNo: { width: 6, height: 6, borderRadius: "50%", background: CIANO, boxShadow: `0 0 6px ${CIANO}` },

  // Corpo
  corpo: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "clamp(12px, 2vw, 26px)",
    minHeight: 0,
  },
  painel: {
    border: `1px solid ${CIANO_SUAVE}`,
    borderRadius: 14,
    padding: "clamp(10px, 1.8vmin, 22px)",
    display: "flex",
    flexDirection: "column",
    gap: "clamp(6px, 1.4vmin, 14px)",
    background: "rgba(8,20,32,0.35)",
    overflowY: "auto",
  },
  colDireita: {
    display: "flex",
    flexDirection: "column",
    gap: "clamp(10px, 1.8vmin, 22px)",
    minHeight: 0,
  },

  // Perfil
  perfil: {
    display: "flex",
    alignItems: "center",
    gap: "clamp(12px, 1.6vw, 22px)",
    paddingBottom: "clamp(4px, 1vmin, 12px)",
  },
  avatarWrap: { position: "relative", flexShrink: 0 },
  avatarRing: {
    width: "clamp(66px, 19vmin, 118px)",
    height: "clamp(66px, 19vmin, 118px)",
    borderRadius: "50%",
    border: `2.5px solid ${CIANO}`,
    boxShadow: `0 0 20px rgba(67,229,255,0.55), inset 0 0 14px rgba(67,229,255,0.25)`,
    background: "linear-gradient(145deg,#0e2c42,#06121e)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "rgba(6,18,28,0.92)",
    border: `2px solid ${CIANO}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: `0 0 10px rgba(67,229,255,0.5)`,
  },
  nomeLinha: { display: "flex", alignItems: "center", gap: 10 },
  nomeInput: {
    minWidth: 0,
    width: "100%",
    maxWidth: 260,
    background: "transparent",
    border: "none",
    borderBottom: "1px solid transparent",
    color: "#fff",
    fontSize: "clamp(22px, 2.6vw, 34px)",
    fontWeight: 700,
    letterSpacing: "0.04em",
    fontFamily: "'Rajdhani', sans-serif",
    outline: "none",
    padding: "2px 0",
    textTransform: "uppercase",
  },
  lapisBtn: { display: "flex", flexShrink: 0, opacity: 0.9 },
  nivelBadge: {
    display: "inline-block",
    marginTop: 10,
    padding: "4px 16px",
    borderRadius: 8,
    border: `1.5px solid ${CIANO}`,
    color: CIANO,
    fontSize: "clamp(13px, 1.4vw, 17px)",
    fontWeight: 600,
    letterSpacing: "0.14em",
  },

  // Linhas de opção
  linha: {
    display: "flex",
    alignItems: "center",
    gap: "clamp(10px, 1.4vw, 18px)",
    padding: "clamp(7px, 1.5vmin, 16px) clamp(12px, 1.4vw, 18px)",
    border: `1px solid rgba(67,229,255,0.16)`,
    borderRadius: 12,
    background: "rgba(67,229,255,0.03)",
  },
  linhaIcone: { display: "flex", flexShrink: 0 },
  linhaLabel: {
    color: "#eafcff",
    fontSize: "clamp(15px, 1.7vw, 21px)",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  linhaSub: {
    color: "rgba(180,210,230,0.6)",
    fontSize: "clamp(12px, 1.3vw, 15px)",
    marginTop: 2,
    fontWeight: 400,
  },

  // Select idioma
  selectWrap: { marginLeft: "auto", position: "relative", display: "flex", alignItems: "center" },
  select: {
    appearance: "none",
    WebkitAppearance: "none",
    background: "transparent",
    border: "none",
    color: "#cfeaff",
    fontSize: "clamp(14px, 1.5vw, 19px)",
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 500,
    paddingRight: 22,
    textAlign: "right",
    cursor: "pointer",
    outline: "none",
    direction: "rtl",
  },
  chevron: { position: "absolute", right: 0, color: CIANO, pointerEvents: "none", fontSize: 16 },

  emailValor: {
    marginLeft: "auto",
    color: "rgba(200,225,240,0.85)",
    fontSize: "clamp(13px, 1.45vw, 18px)",
    fontWeight: 400,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cadeado: { display: "flex", flexShrink: 0, marginLeft: 12, opacity: 0.8 },

  // Toggle
  toggle: (ativo) => ({
    marginLeft: "auto",
    width: 62,
    height: 32,
    flexShrink: 0,
    borderRadius: 32,
    border: `1.5px solid ${ativo ? CIANO : "rgba(255,255,255,0.25)"}`,
    background: ativo ? "rgba(67,229,255,0.25)" : "rgba(255,255,255,0.06)",
    boxShadow: ativo ? `0 0 14px rgba(67,229,255,0.55)` : "none",
    position: "relative",
    cursor: "pointer",
    transition: "all .2s ease",
    padding: 0,
  }),
  toggleKnob: (ativo) => ({
    position: "absolute",
    top: 3,
    left: ativo ? 33 : 3,
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: ativo ? CIANO : "#8fa3b0",
    boxShadow: ativo ? `0 0 12px ${CIANO}` : "none",
    transition: "left .2s ease, background .2s ease",
  }),

  // Cards de volume
  cardVolume: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "clamp(14px, 1.8vw, 24px)",
    border: `1px solid ${CIANO_SUAVE}`,
    borderRadius: 14,
    padding: "clamp(12px, 2.2vmin, 26px) clamp(16px, 2.2vw, 30px)",
    background: "rgba(8,20,32,0.35)",
  },
  hexIcone: {
    width: "clamp(48px, 8vmin, 72px)",
    height: "clamp(48px, 8vmin, 72px)",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1.5px solid ${CIANO_SUAVE}`,
    background: "rgba(67,229,255,0.05)",
    clipPath:
      "polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0 50%)",
  },
  volTitulo: {
    color: "#eafcff",
    fontSize: "clamp(16px, 1.9vw, 24px)",
    fontWeight: 600,
    marginBottom: "clamp(6px, 1.6vmin, 16px)",
  },
  sliderLinha: { display: "flex", alignItems: "center", gap: "clamp(10px, 1.4vw, 18px)" },
  sliderPct: {
    color: "#eafcff",
    fontSize: "clamp(16px, 1.9vw, 24px)",
    fontWeight: 700,
    minWidth: 58,
    textAlign: "right",
    flexShrink: 0,
  },
};
