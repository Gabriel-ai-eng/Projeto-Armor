// ============================================================
// GÊMEO da folha de PARADO (idle) · imagem: assets/armor-parado.webp
// Idle animado: respiração/olhar em volta, em loop por tempo.
// Folha em GRADE (colunas × linhas), lida em zigue-zague (esq→dir, cima→baixo),
// igual à de pular — a folha nova veio em grade em vez de tira horizontal.
// Recolorida (mais quente/dourada e um pouco mais brilhante) para casar com
// o tom do andar/correr — a folha original vinha mais azulada/apagada.
// ============================================================
export default {
  src: 'armor-parado.webp?v=8', // arquivo em assets/ (?v=N fura o cache ao trocar)
  cols: 10, rows: 26, frames: 251, // grade 10x26; última linha só usa 1 coluna (251 = 25*10 + 1)
  fps: 20,                         // velocidade do idle (20 fps ≈ loop de ~12,5 s)
};
