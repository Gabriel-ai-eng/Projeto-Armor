import React from "react";

export default function Configuracoes({ onClose }) {
  const estilos = {
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      fontFamily: "'Rajdhani', sans-serif",
    },

    painel: {
      width: "90%",
      maxWidth: "520px",
      background: "rgba(10,20,35,0.95)",
      border: "2px solid #6ED8FF",
      borderRadius: "18px",
      padding: "28px",
      boxShadow:
        "0 0 25px rgba(110,216,255,.45), inset 0 0 18px rgba(110,216,255,.08)",
      color: "#fff",
    },

    topo: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      marginBottom: "25px",
    },

    avatar: {
      width: "90px",
      height: "90px",
      borderRadius: "50%",
      border: "2px solid #6ED8FF",
      background: "linear-gradient(145deg,#16344d,#08131f)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 0 18px rgba(110,216,255,.45)",
      marginBottom: "15px",
    },

    titulo: {
      fontSize: "32px",
      fontWeight: "700",
      color: "#6ED8FF",
      letterSpacing: "2px",
      textShadow: "0 0 12px #6ED8FF",
      margin: 0,
    },

    subtitulo: {
      color: "#BFDFFF",
      fontSize: "18px",
      marginTop: "4px",
    },

    bloco: {
      marginBottom: "20px",
    },

    label: {
      fontSize: "17px",
      color: "#EAFBFF",
      marginBottom: "8px",
    },

    slider: {
      width: "100%",
      accentColor: "#6ED8FF",
      cursor: "pointer",
    },

    botaoQualidade: {
      width: "100%",
      padding: "12px",
      borderRadius: "10px",
      background: "#11243A",
      border: "1px solid #6ED8FF",
      color: "#6ED8FF",
      fontSize: "17px",
      cursor: "pointer",
      fontWeight: "600",
      transition: ".2s",
    },

    fechar: {
      width: "100%",
      marginTop: "28px",
      padding: "14px",
      background: "#6ED8FF",
      color: "#08131f",
      border: "none",
      borderRadius: "12px",
      fontSize: "20px",
      fontWeight: "700",
      cursor: "pointer",
      boxShadow: "0 0 18px rgba(110,216,255,.5)",
      letterSpacing: "1px",
    },
  };

  return (
    <div style={estilos.overlay}>
      <div style={estilos.painel}>
        <div style={estilos.topo}>
          <div style={estilos.avatar}>
            <svg width="52" height="52" viewBox="0 0 64 64">
              <circle cx="32" cy="20" r="11" fill="#6ED8FF" />
              <path
                d="M14 55c2-11 12-17 18-17s16 6 18 17"
                fill="none"
                stroke="#6ED8FF"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h1 style={estilos.titulo}>GABRIEL</h1>
          <div style={estilos.subtitulo}>Piloto Nível 1</div>
        </div>

        <div style={estilos.bloco}>
          <div style={estilos.label}>Volume do Sistema</div>
          <input
            type="range"
            defaultValue={80}
            style={estilos.slider}
          />
        </div>

        <div style={estilos.bloco}>
          <div style={estilos.label}>Sensibilidade da Mira</div>
          <input
            type="range"
            defaultValue={60}
            style={estilos.slider}
          />
        </div>

        <div style={estilos.bloco}>
          <div style={estilos.label}>Qualidade Gráfica</div>
          <button style={estilos.botaoQualidade}>
            ALTA
          </button>
        </div>

        <button style={estilos.fechar} onClick={onClose}>
          FECHAR
        </button>
      </div>
    </div>
  );
}