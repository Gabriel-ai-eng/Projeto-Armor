import React from 'react';
import Wonderbound from './game/Wonderbound.jsx';

// Wonderbound — app standalone. O jogo ocupa a tela inteira.
// Sem prop onVoltar não há botão "Sair" (não existe hub para voltar aqui).
export default function App() {
  return <Wonderbound />;
}
