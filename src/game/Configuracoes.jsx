import React, { useState, useRef, useEffect } from "react";

// ============================================================
// PROJETO ARMOR · PAINEL DE CONFIGURAÇÕES ("CENTRAL DE COMANDO")
// Modal em estilo HUD sci-fi. Tudo o que é editável aqui é gravado no MESMO
// JSON `state` do jogador (tabela armor_game_state) → persiste no Supabase.
//
// O componente NÃO fala com o banco direto: recebe do ProjetoArmor.jsx o estado
// atual e callbacks:
//   • onAplicarPref(chave, valor) → atualiza a preferência em memória (efeito na
//     hora: nome no perfil, sensibilidade da mira etc.)
//   • onPersistir()               → grava o estado no Supabase (upsert)
//   • onToggleZoom / onToggleRelogio → reaproveitam a lógica já existente do jogo
//   • onResetar()                 → zera o progresso e grava
// ============================================================

const AZUL = "#6ED8FF";
const OURO = "#F0C040";
const VERMELHO = "#FF6B6B";

// Formata segundos em algo humano: "1h 12m", "12m", "45s".
function formatarTempo(seg) {
  const s = Math.max(0, Math.floor(seg || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

// Título por nível — dá uma progressão de "cargo" ao piloto.
function patente(nivel) {
  const nomes = [
    "Recruta",
    "Cadete",
    "Piloto",
    "Piloto Sênior",
    "Tenente",
    "Capitão",
    "Comandante",
    "Ás de Armor",
  ];
  return nomes[Math.min(nivel, nomes.length - 1)];
}

// ---------------- Interruptor (toggle) estilo HUD ----------------
function Interruptor({ ativo, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 58,
        height: 30,
        borderRadius: 30,
        border: `1px solid ${ativo ? AZUL : "rgba(255,255,255,0.25)"}`,
        background: ativo ? "rgba(110,216,255,0.22)" : "rgba(255,255,255,0.06)",
        boxShadow: ativo ? `0 0 12px rgba(110,216,255,0.5)` : "none",
        position: "relative",
        cursor: "pointer",
        transition: "all .2s ease",
        flexShrink: 0,
        padding: 0,
      }}
      aria-pressed={ativo}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: ativo ? 30 : 3,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: ativo ? AZUL : "#8fa3b0",
          boxShadow: ativo ? `0 0 10px ${AZUL}` : "none",
          transition: "left .2s ease, background .2s ease",
        }}
      />
    </button>
  );
}

// ---------------- Linha de opção com toggle ----------------
function LinhaToggle({ titulo, descricao, ativo, onClick }) {
  return (
    <div style={estilos.linha}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={estilos.linhaTitulo}>{titulo}</div>
        <div style={estilos.linhaDesc}>{descricao}</div>
      </div>
      <Interruptor ativo={ativo} onClick={onClick} />
    </div>
  );
}

// ---------------- Slider com valor ao lado ----------------
function Deslizante({ titulo, valor, sufixo, onInput, onCommit, cor = AZUL }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={estilos.sliderTopo}>
        <span style={estilos.linhaTitulo}>{titulo}</span>
        <span style={{ ...estilos.valorTag, color: cor, borderColor: cor }}>
          {valor}
          {sufixo}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={valor}
        onChange={(e) => onInput(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        style={{ ...estilos.slider, accentColor: cor }}
      />
    </div>
  );
}

export default function Configuracoes({
  onClose,
  estado,
  nivel = 0,
  zoomPerto = false,
  relogioAtivo = false,
  onAplicarPref = () => {},
  onPersistir = () => {},
  onToggleZoom = () => {},
  onToggleRelogio = () => {},
  onResetar = () => {},
}) {
  const prefs = (estado && estado.prefs) || {};
  const stats = (estado && estado.stats) || {};

  const [nome, setNome] = useState(prefs.nomePiloto || "");
  const [volume, setVolume] = useState(
    typeof prefs.volume === "number" ? prefs.volume : 70
  );
  const [sens, setSens] = useState(
    typeof prefs.sensibilidade === "number" ? prefs.sensibilidade : 50
  );
  const [confirmarReset, setConfirmarReset] = useState(false);
  const [sync, setSync] = useState("idle"); // idle | salvando | ok
  const syncTimer = useRef(null);

  // Bip curto de feedback (Web Audio) com volume proporcional — faz o controle
  // de volume ter efeito audível de verdade, não só um número salvo.
  const audioRef = useRef(null);
  const beep = (vol = volume, freq = 620) => {
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

  useEffect(() => () => clearTimeout(syncTimer.current), []);

  // Marca "salvando" → grava no Supabase → mostra "sincronizado".
  const persistir = () => {
    setSync("salvando");
    clearTimeout(syncTimer.current);
    Promise.resolve(onPersistir()).finally(() => {
      setSync("ok");
      syncTimer.current = setTimeout(() => setSync("idle"), 1800);
    });
  };

  const mudarNome = (v) => {
    const limpo = v.slice(0, 18);
    setNome(limpo);
    onAplicarPref("nomePiloto", limpo);
  };

  const mudarVolume = (v) => {
    setVolume(v);
    onAplicarPref("volume", v);
  };

  const mudarSens = (v) => {
    setSens(v);
    onAplicarPref("sensibilidade", v);
  };

  const toggleZoom = () => {
    beep(volume, 520);
    onToggleZoom();
    persistir();
  };

  const toggleRelogio = () => {
    if (relogioAtivo) return; // ativar relógio é irreversível na sessão
    beep(volume, 720);
    onToggleRelogio();
    persistir();
  };

  const confirmarResetar = async () => {
    beep(volume, 320);
    await Promise.resolve(onResetar());
    setNome("");
    setVolume(70);
    setSens(50);
    setConfirmarReset(false);
    setSync("ok");
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => setSync("idle"), 1800);
  };

  const fechar = () => {
    beep(volume, 480);
    persistir();
    onClose();
  };

  // O toque que ABRE este painel (soltar o dedo no botão "Configurações") só
  // termina de verdade um instante depois, quando o navegador despacha o
  // "click" sintético daquele mesmo gesto. Nesse momento o painel já está
  // montado cobrindo a tela — então esse click "sobrando" cai bem em cima do
  // fundo (que fecha ao tocar fora) e fecha o painel na hora, antes do
  // usuário sequer ver. Por isso "não abria": abria e fechava no mesmo
  // instante. `pronto` só libera o fechar-pelo-fundo depois que o painel já
  // pintou na tela, descartando esse resíduo do gesto de abertura.
  const prontoRef = useRef(false);
  useEffect(() => {
    prontoRef.current = true;
  }, []);

  const fecharPorFundo = () => {
    if (!prontoRef.current) return;
    fechar();
  };

  // XP dentro do nível atual (nível sobe a cada 120s de jogo — regra do jogo).
  const tempo = stats.tempoJogadoSeg || 0;
  const xpNoNivel = Math.max(0, tempo - nivel * 120);
  const pctXp = Math.min(100, Math.round((xpNoNivel / 120) * 100));

  const inicial = (nome.trim()[0] || "").toUpperCase();
  const statusTxt =
    sync === "salvando"
      ? "Salvando…"
      : sync === "ok"
      ? "Sincronizado na nuvem"
      : "Progresso salvo automaticamente";

  return (
    <div style={estilos.overlay} onPointerDown={fecharPorFundo}>
      <div style={estilos.painel} onPointerDown={(e) => e.stopPropagation()}>
        {/* brilho de topo + cantos de HUD */}
        <div style={estilos.scan} />
        <span style={{ ...estilos.canto, top: 8, left: 8 }} />
        <span style={{ ...estilos.canto, top: 8, right: 8, transform: "scaleX(-1)" }} />
        <span style={{ ...estilos.canto, bottom: 8, left: 8, transform: "scaleY(-1)" }} />
        <span style={{ ...estilos.canto, bottom: 8, right: 8, transform: "scale(-1)" }} />

        <div style={estilos.conteudo} className="armor-cfg-scroll">
          {/* ---------- CABEÇALHO ---------- */}
          <div style={estilos.header}>
            <div style={estilos.eyebrow}>◈ SISTEMA ARMOR</div>
            <h1 style={estilos.titulo}>CENTRAL DE COMANDO</h1>
          </div>

          {/* ---------- CARTÃO DO PILOTO ---------- */}
          <div style={estilos.cartao}>
            <div style={estilos.avatar}>
              {inicial ? (
                <span style={estilos.avatarLetra}>{inicial}</span>
              ) : (
                <svg width="40" height="40" viewBox="0 0 64 64">
                  <circle cx="32" cy="22" r="12" fill={AZUL} />
                  <path
                    d="M12 56c0-12 9-18 20-18s20 6 20 18"
                    fill="none"
                    stroke={AZUL}
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              <span style={estilos.nivelBadge}>{nivel}</span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={estilos.miniLabel}>NOME DO PILOTO</label>
              <input
                value={nome}
                onChange={(e) => mudarNome(e.target.value)}
                onBlur={persistir}
                placeholder="Digite seu nome…"
                style={estilos.inputNome}
                maxLength={18}
              />
              <div style={estilos.patente}>
                {patente(nivel)} · Nível {nivel}
              </div>
              <div style={estilos.xpTrilho}>
                <div style={{ ...estilos.xpBarra, width: `${pctXp}%` }} />
              </div>
              <div style={estilos.xpTxt}>{pctXp}% para o próximo nível</div>
            </div>
          </div>

          {/* ---------- ESTATÍSTICAS ---------- */}
          <div style={estilos.statsGrid}>
            <div style={estilos.stat}>
              <div style={estilos.statNum}>{formatarTempo(tempo)}</div>
              <div style={estilos.statLbl}>Em campo</div>
            </div>
            <div style={estilos.stat}>
              <div style={estilos.statNum}>{stats.sessoes || 0}</div>
              <div style={estilos.statLbl}>Sessões</div>
            </div>
            <div style={estilos.stat}>
              <div style={estilos.statNum}>{nivel}</div>
              <div style={estilos.statLbl}>Nível</div>
            </div>
          </div>

          {/* ---------- ÁUDIO & CONTROLES ---------- */}
          <div style={estilos.secao}>
            <div style={estilos.secaoTitulo}>ÁUDIO & CONTROLES</div>
            <Deslizante
              titulo="Volume do sistema"
              valor={volume}
              sufixo="%"
              onInput={mudarVolume}
              onCommit={() => {
                beep(volume);
                persistir();
              }}
            />
            <Deslizante
              titulo="Sensibilidade da mira"
              valor={sens}
              sufixo="%"
              cor={OURO}
              onInput={mudarSens}
              onCommit={persistir}
            />
          </div>

          {/* ---------- PREFERÊNCIAS ---------- */}
          <div style={estilos.secao}>
            <div style={estilos.secaoTitulo}>PREFERÊNCIAS DE JOGO</div>
            <LinhaToggle
              titulo="Câmera aproximada"
              descricao="Aproxima a câmera do personagem durante o jogo."
              ativo={zoomPerto}
              onClick={toggleZoom}
            />
            <LinhaToggle
              titulo="Ciclo dia / noite real"
              descricao={
                relogioAtivo
                  ? "Ativo — o céu segue o horário real do seu local."
                  : "Sincroniza o céu do jogo com a hora e o sol reais."
              }
              ativo={relogioAtivo}
              onClick={toggleRelogio}
            />
          </div>

          {/* ---------- ZONA DE PERIGO ---------- */}
          <div style={estilos.secao}>
            <div style={{ ...estilos.secaoTitulo, color: VERMELHO }}>
              ZONA DE PERIGO
            </div>
            {!confirmarReset ? (
              <button
                style={estilos.botaoReset}
                onClick={() => setConfirmarReset(true)}
              >
                Resetar progresso
              </button>
            ) : (
              <div style={estilos.confirmBox}>
                <div style={estilos.confirmTxt}>
                  Isso apaga nome, nível e posição. Tem certeza?
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    style={estilos.botaoConfirma}
                    onClick={confirmarResetar}
                  >
                    Sim, apagar
                  </button>
                  <button
                    style={estilos.botaoCancela}
                    onClick={() => setConfirmarReset(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ---------- STATUS DE NUVEM ---------- */}
          <div style={estilos.nuvem}>
            <span
              style={{
                ...estilos.nuvemPonto,
                background: sync === "salvando" ? OURO : AZUL,
                animation:
                  sync === "salvando" ? "armorPulse 0.8s infinite" : "none",
              }}
            />
            {statusTxt}
          </div>

          {/* ---------- FECHAR ---------- */}
          <button style={estilos.fechar} onClick={fechar}>
            SALVAR E FECHAR
          </button>
        </div>
      </div>

      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
@keyframes armorScan {
  0% { transform: translateY(-100%); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateY(1200%); opacity: 0; }
}
@keyframes armorPulse {
  0%,100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.7); }
}
@keyframes armorEntrada {
  from { opacity: 0; transform: translateY(14px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.armor-cfg-scroll::-webkit-scrollbar { width: 6px; }
.armor-cfg-scroll::-webkit-scrollbar-thumb {
  background: rgba(110,216,255,0.4); border-radius: 6px;
}
`;

const estilos = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "radial-gradient(circle at 50% 30%, rgba(10,30,50,0.7), rgba(0,0,0,0.82))",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    fontFamily: "'Rajdhani', 'Segoe UI', sans-serif",
    padding: 16,
    boxSizing: "border-box",
  },
  painel: {
    position: "relative",
    width: "100%",
    maxWidth: 540,
    maxHeight: "92vh",
    background:
      "linear-gradient(160deg, rgba(12,26,42,0.97), rgba(6,14,24,0.98))",
    border: `1px solid rgba(110,216,255,0.55)`,
    borderRadius: 20,
    boxShadow:
      "0 0 40px rgba(110,216,255,0.28), inset 0 0 24px rgba(110,216,255,0.06)",
    color: "#fff",
    overflow: "hidden",
    animation: "armorEntrada .28s ease",
  },
  scan: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    background:
      "linear-gradient(180deg, rgba(110,216,255,0.28), transparent)",
    pointerEvents: "none",
    animation: "armorScan 4.5s ease-in-out infinite",
  },
  canto: {
    position: "absolute",
    width: 16,
    height: 16,
    borderTop: `2px solid ${AZUL}`,
    borderLeft: `2px solid ${AZUL}`,
    opacity: 0.8,
    pointerEvents: "none",
  },
  conteudo: {
    padding: "26px 24px 22px",
    maxHeight: "92vh",
    overflowY: "auto",
  },
  header: { textAlign: "center", marginBottom: 22 },
  eyebrow: {
    color: AZUL,
    fontSize: 12,
    letterSpacing: "0.28em",
    fontWeight: 600,
    opacity: 0.85,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 700,
    color: "#EAFBFF",
    letterSpacing: "0.14em",
    textShadow: `0 0 18px rgba(110,216,255,0.6)`,
    margin: "4px 0 0",
  },
  cartao: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 16,
    background:
      "linear-gradient(135deg, rgba(110,216,255,0.10), rgba(110,216,255,0.02))",
    border: "1px solid rgba(110,216,255,0.28)",
    marginBottom: 16,
  },
  avatar: {
    position: "relative",
    width: 78,
    height: 78,
    borderRadius: "50%",
    border: `2px solid ${AZUL}`,
    background: "linear-gradient(145deg,#12324c,#07121e)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `0 0 18px rgba(110,216,255,0.45)`,
    flexShrink: 0,
  },
  avatarLetra: {
    fontSize: 38,
    fontWeight: 700,
    color: AZUL,
    textShadow: `0 0 14px ${AZUL}`,
  },
  nivelBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    minWidth: 24,
    height: 24,
    padding: "0 5px",
    borderRadius: 12,
    background: OURO,
    color: "#08131f",
    fontSize: 13,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `0 0 12px rgba(240,192,64,0.6)`,
  },
  miniLabel: {
    display: "block",
    fontSize: 10,
    letterSpacing: "0.18em",
    color: "rgba(191,223,255,0.65)",
    marginBottom: 4,
  },
  inputNome: {
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(110,216,255,0.35)",
    borderRadius: 9,
    color: "#fff",
    fontSize: 20,
    fontWeight: 600,
    fontFamily: "'Rajdhani', sans-serif",
    padding: "6px 10px",
    outline: "none",
  },
  patente: {
    color: OURO,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "0.04em",
    marginTop: 7,
  },
  xpTrilho: {
    marginTop: 6,
    height: 6,
    borderRadius: 6,
    background: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  xpBarra: {
    height: "100%",
    borderRadius: 6,
    background: `linear-gradient(90deg, ${AZUL}, #9be9ff)`,
    boxShadow: `0 0 10px ${AZUL}`,
    transition: "width .4s ease",
  },
  xpTxt: {
    fontSize: 11,
    color: "rgba(191,223,255,0.7)",
    marginTop: 4,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    marginBottom: 20,
  },
  stat: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "12px 6px",
    textAlign: "center",
  },
  statNum: {
    fontSize: 20,
    fontWeight: 700,
    color: AZUL,
    textShadow: `0 0 10px rgba(110,216,255,0.4)`,
  },
  statLbl: {
    fontSize: 11,
    letterSpacing: "0.1em",
    color: "rgba(191,223,255,0.6)",
    marginTop: 2,
    textTransform: "uppercase",
  },
  secao: { marginBottom: 20 },
  secaoTitulo: {
    fontSize: 12,
    letterSpacing: "0.22em",
    color: AZUL,
    fontWeight: 600,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottom: "1px solid rgba(110,216,255,0.18)",
  },
  linha: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 0",
  },
  linhaTitulo: {
    fontSize: 16,
    fontWeight: 600,
    color: "#EAFBFF",
  },
  linhaDesc: {
    fontSize: 12,
    color: "rgba(191,223,255,0.6)",
    marginTop: 2,
    lineHeight: 1.3,
  },
  sliderTopo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  valorTag: {
    fontSize: 13,
    fontWeight: 700,
    border: "1px solid",
    borderRadius: 7,
    padding: "1px 8px",
    minWidth: 42,
    textAlign: "center",
  },
  slider: {
    width: "100%",
    cursor: "pointer",
    height: 6,
  },
  botaoReset: {
    width: "100%",
    padding: "12px",
    borderRadius: 10,
    background: "rgba(255,107,107,0.10)",
    border: `1px solid rgba(255,107,107,0.5)`,
    color: VERMELHO,
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: "0.06em",
    cursor: "pointer",
    fontFamily: "'Rajdhani', sans-serif",
  },
  confirmBox: {
    background: "rgba(255,107,107,0.08)",
    border: "1px solid rgba(255,107,107,0.4)",
    borderRadius: 12,
    padding: 14,
  },
  confirmTxt: {
    fontSize: 14,
    color: "#ffdede",
    marginBottom: 12,
  },
  botaoConfirma: {
    flex: 1,
    padding: "10px",
    borderRadius: 9,
    background: VERMELHO,
    border: "none",
    color: "#2a0a0a",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Rajdhani', sans-serif",
  },
  botaoCancela: {
    flex: 1,
    padding: "10px",
    borderRadius: 9,
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "#cfe6ff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Rajdhani', sans-serif",
  },
  nuvem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 12,
    letterSpacing: "0.06em",
    color: "rgba(191,223,255,0.7)",
    marginBottom: 16,
  },
  nuvemPonto: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    boxShadow: `0 0 8px ${AZUL}`,
  },
  fechar: {
    width: "100%",
    padding: 15,
    background: `linear-gradient(135deg, ${AZUL}, #4fc3f0)`,
    color: "#04121e",
    border: "none",
    borderRadius: 12,
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "0.1em",
    cursor: "pointer",
    boxShadow: `0 0 22px rgba(110,216,255,0.5)`,
    fontFamily: "'Rajdhani', sans-serif",
  },
};
