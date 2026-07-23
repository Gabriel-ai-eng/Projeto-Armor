// ============================================================
// GÊMEO da folha de PARADO (idle) · imagem: assets/wonderbound-parado.webp
// Idle animado: respiração/olhar em volta, em loop por tempo.
// Folha em GRADE (colunas × linhas), lida esq→dir, cima→baixo.
// ============================================================
export default {
  // v=12: folha nova (arte enviada), recortada certo na grade — veio com
  // margem em branco ao redor do conteúdo real, tanto nas bordas (colunas
  // vazias dos lados) quanto DENTRO de cada célula (corpo ocupava só ~69%
  // da altura da célula, o que deixava o personagem MAIOR que andar/correr
  // — a escala do jogo é derivada dessa proporção corpo/célula). Recortada
  // sem essa folga (corpo ocupa ~96% da célula, igual à folha antiga).
  src: 'wonderbound-parado.webp?v=12', // arquivo em assets/ (?v=N fura o cache ao trocar)
  cols: 10, rows: 13, frames: 124, // grade 10x13; última linha só usa 4 colunas (124 = 12*10 + 4)
  fps: 20,                         // velocidade do idle (20 fps ≈ loop de ~6,2 s)
};
