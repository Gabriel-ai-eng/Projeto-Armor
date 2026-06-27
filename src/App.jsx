import React from 'react';
import Titan from './game/Titan.jsx';

// Projeto Armor — app standalone. O jogo (TITAN) ocupa a tela inteira.
// Sem prop onVoltar não há botão "Sair" (não existe hub para voltar aqui).
export default function App() {
  return <Titan />;
}
