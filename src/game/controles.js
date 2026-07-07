// ============================================================
// PROJETO ARMOR · CONTROLES (input do jogador)
// Os handlers de toque dos DOIS joysticks (mover à esquerda, mirar à direita),
// do botão de VOAR e da "onda"/efeito piano dos botões da tela inicial.
//
// Tudo lê/escreve por refs (moveRef, aimRef, G…) e alguns setters de feedback
// visual (posição dos knobs, brilho do voar) — por isso mora fora do componente
// sem depender do ciclo de render do React. O motor (motor.js) consome moveRef
// e aimRef a cada frame.
//
// Recebe (deps) os refs/setters e os callbacks entrar()/sair(), e devolve os
// handlers prontos para os elementos DOM no JSX.
// ============================================================

export function criarControles(deps) {
  const {
    setKnobOff, setMiraOff, setVoarAtivo,
    moveRef, aimRef, joyBaseRef, joyPointerRef, miraBaseRef, miraPointerRef,
    G, btnRefs, arrastoMenuRef, entrar, sair,
  } = deps;

  // ---------- ONDA / EFEITO PIANO DOS BOTÕES DA TELA INICIAL ----------
  // Segurar e deslizar pelos botões faz cada um acender, saltar e desvanecer em
  // sequência, formando uma onda (tipo teclas de piano). Só dispara ao arrastar;
  // um toque simples continua acionando o botão normalmente.
  const acenderBotao = (id) => {
    const el = btnRefs.current[id];
    if (!el) return;
    el.classList.remove('is-onda');
    el.classList.add('is-ativo');
  };
  const soltarComOnda = (id) => {
    const el = btnRefs.current[id];
    if (!el) return;
    el.classList.remove('is-ativo');
    el.classList.remove('is-onda');
    void el.offsetWidth;          // reinicia a animação mesmo em passagens rápidas
    el.classList.add('is-onda');
  };
  const botaoSobPonto = (x, y) => {
    const alvo = document.elementFromPoint(x, y);
    const btn = alvo && alvo.closest ? alvo.closest('[data-armor-btn]') : null;
    return btn ? btn.dataset.armorBtn : null;
  };
  const menuDown = (e, id) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    arrastoMenuRef.current = { ativo: true, atual: id, inicio: id, vagou: false };
    acenderBotao(id);
  };
  const menuMove = (e) => {
    const d = arrastoMenuRef.current;
    if (!d.ativo) return;
    const id = botaoSobPonto(e.clientX, e.clientY);
    if (!id || id === d.atual) return;    // ainda no mesmo botão (ou num vão): mantém
    if (d.atual) soltarComOnda(d.atual);  // deixa o rastro da onda no botão anterior
    acenderBotao(id);
    d.atual = id;
    d.vagou = true;                        // deslizou para outro botão → gesto de onda
  };
  const menuUp = () => {
    const d = arrastoMenuRef.current;
    if (!d.ativo) return;
    if (d.atual) soltarComOnda(d.atual);
    // Só navega num toque limpo (sem deslizar por outros botões).
    if (!d.vagou && d.inicio === d.atual) {
      if (d.inicio === 'jogar') entrar();
      else if (d.inicio === 'sair') sair();
    }
    arrastoMenuRef.current = { ativo: false, atual: null, inicio: null, vagou: false };
  };
  const menuFimAnim = (e) => {
    if (e.animationName === 'armorOnda') e.currentTarget.classList.remove('is-onda');
  };

  // ---------- JOYSTICK DE MOVER (lado esquerdo) ----------
  // Base fixa; o knob segue o dedo limitado ao raio. O componente x do
  // deslocamento vira a velocidade horizontal do personagem.
  const joyAtualizar = (clientX, clientY) => {
    const el = joyBaseRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const maxR = (r.width / 2) * 0.58;
    let dx = clientX - cx, dy = clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > maxR && d > 0) { dx = dx / d * maxR; dy = dy / d * maxR; }
    setKnobOff({ x: dx, y: dy });
    moveRef.current = { x: dx / maxR, mag: Math.min(Math.hypot(dx, dy) / maxR, 1) };
  };
  const joyInicio = (e) => {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    joyPointerRef.current = e.pointerId;
    joyAtualizar(e.clientX, e.clientY);
  };
  const joyMover = (e) => {
    if (joyPointerRef.current !== e.pointerId) return;
    joyAtualizar(e.clientX, e.clientY);
  };
  const joyFim = (e) => {
    if (joyPointerRef.current !== e.pointerId) return;
    joyPointerRef.current = null;
    setKnobOff({ x: 0, y: 0 });
    moveRef.current = { x: 0, mag: 0 };
  };

  // ---------- BOTÃO DE VOAR (lado direito) ----------
  // 1 toque no chão = pulo animado · 2 toques rápidos + segurar = voar.
  const voarPress = (e) => {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    const g = G.current;
    if (g) {
      const now = performance.now();
      if (now - g.lastFlyDown < 320) { g.flying = true; g.jump = null; } // 2º toque → voa
      else if (g.p.y <= 2 && !g.jump) g.jump = { f: 0 };                 // no chão → pulo animado
      g.lastFlyDown = now;
    }
    setVoarAtivo(true);
  };
  const voarRelease = () => {
    const g = G.current;
    if (g) g.flying = false; // soltar → cai
    setVoarAtivo(false);
  };

  // ---------- JOYSTICK DE MIRAR (lado direito) ----------
  // Direção da mira; empurrado além da zona-morta, dispara nessa direção.
  const miraAtualizar = (clientX, clientY) => {
    const el = miraBaseRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const maxR = (r.width / 2) * 0.58;
    let dx = clientX - cx, dy = clientY - cy;
    const d = Math.hypot(dx, dy);
    let kx = dx, ky = dy;
    if (d > maxR && d > 0) { kx = dx / d * maxR; ky = dy / d * maxR; }
    setMiraOff({ x: kx, y: ky });
    if (d > maxR * 0.28) aimRef.current = { active: true, ang: Math.atan2(dy, dx) };
    else aimRef.current = { active: false, ang: 0 };
  };
  const miraInicio = (e) => {
    e.preventDefault();
    // Só ativa se o toque COMEÇAR sobre o joystick de mira (com ~35% de
    // folga ao redor da base). Toques em outros pontos da tela são
    // ignorados — nada de atirar por encostar em qualquer lugar.
    const el = miraBaseRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (Math.hypot(e.clientX - cx, e.clientY - cy) > (r.width / 2) * 1.35) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    miraPointerRef.current = e.pointerId;
    miraAtualizar(e.clientX, e.clientY);
  };
  const miraMover = (e) => {
    if (miraPointerRef.current !== e.pointerId) return;
    miraAtualizar(e.clientX, e.clientY);
  };
  const miraFim = (e) => {
    if (miraPointerRef.current !== e.pointerId) return;
    miraPointerRef.current = null;
    setMiraOff({ x: 0, y: 0 });
    aimRef.current = { active: false, ang: 0 };
  };

  return {
    menuDown, menuMove, menuUp, menuFimAnim,
    joyInicio, joyMover, joyFim,
    voarPress, voarRelease,
    miraInicio, miraMover, miraFim,
  };
}
