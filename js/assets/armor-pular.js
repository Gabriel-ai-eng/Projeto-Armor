// ============================================================
// GÊMEO da folha de PULAR · imagem: assets/armor-pular.webp
// Folha em GRADE (colunas × linhas), lida esq→dir, cima→baixo:
// agacha → impulso a jato → voo → aterrissagem → fica de pé.
// Só os quadros ÍMPARES da folha (1º, 3º, 5º...) entram na animação — os
// pares são pulados (ver render.js), igual foi feito no idle.
// Aqui você edita a grade, o CORTE/escala (bodyR, footR), a velocidade e os
// quadros de decolagem/pouso do pulo.
// ============================================================
export default {
  src: 'armor-pular.webp?v=4', // folha nova, recortada certo na grade (?v=4 fura o cache)
  cols: 10, rows: 16, frames: 160, // grade 10x16, sem sobra (160 = 16*10)
  bodyR: 0.777,   // altura do corpo ÷ altura da célula (medido no quadro 0, em pé)
  footR: 0.112,   // distância dos pés até a base da célula (medido no quadro 0)
  // animSpeed reduzido na mesma proporção da queda de quadros (207->160) pra
  // manter a MESMA duração total do pulo de antes (velocidade sem alteração).
  animSpeed: 2.16, // quadros de sprite por tick
  launchF: 30,     // quadro em que sai do chão (começa o jato/impulso)
  landF: 130,      // quadro em que aterrissa (pose de impacto/poeira)
  arcH: 100,       // altura do arco do pulo (px)
};
