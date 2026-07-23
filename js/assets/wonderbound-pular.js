// ============================================================
// GÊMEO da folha de PULAR · imagem: assets/wonderbound-pular.webp
// Folha em GRADE (colunas × linhas), lida esq→dir, cima→baixo:
// agacha → impulso a jato → voo → aterrissagem → fica de pé.
// Todos os quadros entram na animação, em sequência.
// Aqui você edita a grade, o CORTE/escala (bodyR, footR), a velocidade e os
// quadros de decolagem/pouso do pulo.
// v=5: arte enviada reempacotada numa grade 10x16 DENSA — a folha original
// tinha os personagens espaçados a ~390px (não os 512px de uma grade 10
// colunas uniforme cobrindo a imagem inteira), o que fazia cada quadro
// cortado pegar pedaço do personagem vizinho ("fantasma" duplicado no jogo).
// ============================================================
export default {
  src: 'wonderbound-pular.webp?v=5', // folha reempacotada (?v=5 fura o cache)
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
