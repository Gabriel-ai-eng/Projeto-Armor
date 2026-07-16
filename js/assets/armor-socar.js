// ============================================================
// GÊMEO da folha de SOCAR (combo de socos) · imagem: assets/armor-socar.webp
// Folha em GRADE (colunas × linhas), lida esq→dir, cima→baixo — 45 quadros,
// reempacotados numa grade densa 9×5 a partir da arte original (que tinha
// células vazias no início da 1ª fileira e no fim da última).
// Disparada pelo botão de LUTAR (ícone de raio): toca a folha INTEIRA pra
// frente e, ao terminar, toca sozinha em modo REVERSO até voltar ao quadro 0.
// ============================================================
export default {
  src: 'armor-socar.webp?v=1', // arquivo em assets/ (?v=N fura o cache ao trocar)
  cols: 9, rows: 5, frames: 45, // grade densa 9x5, sem sobra (45 = 5*9)
  animSpeed: 1, // quadros de sprite por tick (60/s) — combo de ida leva ~0,75s
};
