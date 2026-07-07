// ============================================================
// GÊMEO da folha de PULAR · imagem: assets/armor-pular.webp
// Folha em GRADE (colunas × linhas), lida em zigue-zague (esq→dir, cima→baixo):
// agacha → impulso a jato → voo → aterrissagem → fica de pé.
// Aqui você edita a grade, o CORTE/escala (bodyR, footR), a velocidade e os
// quadros de decolagem/pouso do pulo.
// ============================================================
export default {
  src: 'armor-pular.webp?v=1', // arquivo em assets/ (?v=N fura o cache ao trocar)
  cols: 10, rows: 17, frames: 170, // grade e total de quadros
  bodyR: 0.797,   // altura do corpo ÷ altura da célula (escala/corte vertical, frame em pé)
  footR: 0.12,    // distância dos pés até a base da célula (planta os pés no chão)
  animSpeed: 1.6, // quadros de sprite por tick (~1,8 s para os 170 frames)
  launchF: 30,    // quadro em que sai do chão (fim da anticipação)
  landF: 129,     // quadro em que aterrissa (impacto/poeira)
  arcH: 100,      // altura do arco do pulo (px)
};
