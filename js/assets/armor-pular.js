// ============================================================
// GÊMEO da folha de PULAR · imagem: assets/armor-pular.webp
// Folha em GRADE (colunas × linhas), lida em zigue-zague (esq→dir, cima→baixo):
// agacha → impulso a jato → voo → aterrissagem → fica de pé.
// Aqui você edita a grade, o CORTE/escala (bodyR, footR), a velocidade e os
// quadros de decolagem/pouso do pulo.
// ============================================================
export default {
  src: 'armor-pular.webp?v=3', // folha estabilizada quadro a quadro (?v=3 fura o cache)
  cols: 10, rows: 21, frames: 207, // grade 10x21; última linha só usa 7 colunas (207 = 20*10 + 7)
  bodyR: 0.807,   // altura do corpo ÷ altura da célula (medido no quadro 0, em pé)
  footR: 0.102,   // distância dos pés até a base da célula (medido no quadro 0)
  animSpeed: 1.95, // quadros de sprite por tick (mantém ~1,8s de pulo com 207 quadros)
  launchF: 30,    // quadro em que sai do chão (linha 3: começa o jato/impulso)
  landF: 140,     // quadro em que aterrissa (linha 14: pose de impacto/poeira)
  arcH: 100,      // altura do arco do pulo (px)
};
