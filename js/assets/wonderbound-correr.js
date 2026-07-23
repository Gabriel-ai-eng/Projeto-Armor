// ============================================================
// GÊMEO da folha de CORRER · imagem hospedada externamente (i.ibb.co)
// Como não é um arquivo local, o src é a URL completa (não passa por assets/).
// ============================================================
export default {
  src: 'https://i.ibb.co/tTxmyXws/titan-correr-tira.png',
  frames: 15,   // quadros da tira de corrida

  // O tamanho ao correr é IGUALADO sozinho ao do andar/pular (pela área do
  // corpo — ver carregarSprites.js), porque esta folha não tem pose em pé
  // para medir a altura. Se mesmo assim ele parecer maior ou menor que
  // andando, afine aqui: 1 = automático; 1.05 = 5% maior; 0.95 = 5% menor.
  alturaRel: 1,
};
