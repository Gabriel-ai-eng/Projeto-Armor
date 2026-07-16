// ============================================================
// GÊMEO da folha de AGACHAR · imagem: assets/armor-agachar.webp
// Tira horizontal (6 quadros), lida esq→dir: de pé (0) até totalmente
// agachado (5). Não é um loop — toca pra FRENTE ao agachar (joystick pro
// chão) e pra TRÁS (mesmos quadros, ao contrário) ao soltar o manche, até
// voltar pro quadro 0 (de pé, mesma pose do idle).
// (O corte/escala do corpo desta tira é medido sozinho em tempo real —
//  autocalibração, igual ao andar/correr; aqui você mexe em quadros/velocidade.)
// ============================================================
export default {
  src: 'armor-agachar.webp?v=1', // arquivo em assets/ (?v=N fura o cache ao trocar)
  frames: 6,          // quadro 0 = de pé, quadro 5 = agachado no chão
  velTransicao: 0.35, // quadros de sprite por tick (60/s) — agachar/levantar leva ~14 ticks (~0,24s)
};
