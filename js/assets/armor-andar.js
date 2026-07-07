// ============================================================
// GÊMEO da folha de ANDAR (caminhada) · imagem: assets/armor-andar.webp
// Igual ao Free Kick World: aqui você edita OS NÚMEROS desta folha de sprite.
// Trocou a arte? Troque a imagem em assets/ e suba o ?v=N abaixo.
// (O "corte"/escala do corpo desta tira é medido sozinho em tempo real —
//  autocalibração; por isso aqui você mexe em quadros e cadência.)
// ============================================================
export default {
  src: 'armor-andar.webp?v=13', // Atualizado o cache (?v=13)
  frames: 79,                   // total de quadros da tira (0 = parado, 1..78 = ciclo)
  frameParado: 0,               // quadro usado como "parado" se o idle não carregar
  
  // DICA: Para deixar a animação base mais lenta globalmente, você pode
  // aumentar este número. Ex: 120 ticks = 2 segundos para um passo completo.
  cicloTicks: 71,               // ticks (60/s) para uma volta completa (velocidade do andar)
};
