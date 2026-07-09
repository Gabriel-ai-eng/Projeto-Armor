// ============================================================
// PROJETO ARMOR · CONTROLES (input do jogador)
// ============================================================

export function criarControles(deps) {
  const {
    setKnobOff,
    setMiraOff,
    setVoarAtivo,

    moveRef,
    aimRef,

    joyBaseRef,
    joyPointerRef,

    miraBaseRef,
    miraPointerRef,

    G,

    btnRefs,
    arrastoMenuRef,

    entrar,
    sair,
    mostrarEmBreve,

    abrirConfiguracoes, // NOVO

    sensibilidadeRef // sensibilidade da mira (0..100) vinda das Configurações
  } = deps;

  // ==========================================================
  // BOTÕES MENU
  // ==========================================================

  const acenderBotao = (id) => {
    const el = btnRefs.current[id];
    if (!el) return;

    el.classList.remove("is-onda");
    el.classList.add("is-ativo");
  };

  const soltarComOnda = (id) => {
    const el = btnRefs.current[id];
    if (!el) return;

    el.classList.remove("is-ativo");
    el.classList.remove("is-onda");

    void el.offsetWidth;

    el.classList.add("is-onda");
  };

  const botaoSobPonto = (x, y) => {
    const alvo = document.elementFromPoint(x, y);
    const btn =
      alvo && alvo.closest
        ? alvo.closest("[data-armor-btn]")
        : null;

    return btn ? btn.dataset.armorBtn : null;
  };

  const menuDown = (e, id) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);

    arrastoMenuRef.current = {
      ativo: true,
      atual: id,
      inicio: id,
      vagou: false,
    };

    acenderBotao(id);
  };

  const menuMove = (e) => {
    const d = arrastoMenuRef.current;

    if (!d.ativo) return;

    const id = botaoSobPonto(
      e.clientX,
      e.clientY
    );

    if (!id || id === d.atual) return;

    if (d.atual) {
      soltarComOnda(d.atual);
    }

    acenderBotao(id);

    d.atual = id;
    d.vagou = true;
  };

  const menuUp = () => {
    const d = arrastoMenuRef.current;

    if (!d.ativo) return;

    if (d.atual) {
      soltarComOnda(d.atual);
    }

    if (!d.vagou && d.inicio === d.atual) {

      switch (d.inicio) {

        case "jogar":
          entrar();
          break;

        case "sair":
          sair();
          break;

        case "configuracoes":
          abrirConfiguracoes?.();
          break;

        default:
          mostrarEmBreve?.();
          break;
      }
    }

    arrastoMenuRef.current = {
      ativo: false,
      atual: null,
      inicio: null,
      vagou: false,
    };
  };

  const menuFimAnim = (e) => {
    if (e.animationName === "armorOnda") {
      e.currentTarget.classList.remove("is-onda");
    }
  };

  // ==========================================================
  // JOYSTICK ESQUERDO
  // ==========================================================

  const joyAtualizar = (clientX, clientY) => {

    const el = joyBaseRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();

    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    const maxR = (r.width / 2) * 0.58;

    let dx = clientX - cx;
    let dy = clientY - cy;

    const d = Math.hypot(dx, dy);

    if (d > maxR && d > 0) {
      dx = (dx / d) * maxR;
      dy = (dy / d) * maxR;
    }

    setKnobOff({
      x: dx,
      y: dy,
    });

    moveRef.current = {
      x: dx / maxR,
      mag: Math.min(
        Math.hypot(dx, dy) / maxR,
        1
      ),
    };
  };

  const joyInicio = (e) => {

    e.preventDefault();

    const el = joyBaseRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();

    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    if (
      Math.hypot(
        e.clientX - cx,
        e.clientY - cy
      ) >
      (r.width / 2) * 1.1
    )
      return;

    try {
      e.currentTarget.setPointerCapture(
        e.pointerId
      );
    } catch {}

    joyPointerRef.current = e.pointerId;

    joyAtualizar(
      e.clientX,
      e.clientY
    );
  };

  const joyMover = (e) => {

    if (
      joyPointerRef.current !==
      e.pointerId
    )
      return;

    joyAtualizar(
      e.clientX,
      e.clientY
    );
  };

  const joyFim = (e) => {

    if (
      joyPointerRef.current !==
      e.pointerId
    )
      return;

    joyPointerRef.current = null;

    setKnobOff({
      x: 0,
      y: 0,
    });

    moveRef.current = {
      x: 0,
      mag: 0,
    };
  };

  // ==========================================================
  // BOTÃO VOAR
  // ==========================================================

  const voarPress = (e) => {

    e.preventDefault();

    try {
      e.currentTarget.setPointerCapture(
        e.pointerId
      );
    } catch {}

    const g = G.current;

    if (g) {

      const now = performance.now();

      if (now - g.lastFlyDown < 320) {

        g.flying = true;
        g.jump = null;

      } else if (g.p.y <= 2 && !g.jump) {

        g.jump = {
          f: 0,
        };
      }

      g.lastFlyDown = now;
    }

    setVoarAtivo(true);
  };

  const voarRelease = () => {

    const g = G.current;

    if (g) {
      g.flying = false;
    }

    setVoarAtivo(false);
  };

  // ==========================================================
  // JOYSTICK MIRAR
  // ==========================================================

  const miraAtualizar = (
    clientX,
    clientY
  ) => {

    const el = miraBaseRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();

    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    const maxR = (r.width / 2) * 0.58;

    let dx = clientX - cx;
    let dy = clientY - cy;

    const d = Math.hypot(dx, dy);

    let kx = dx;
    let ky = dy;

    if (d > maxR && d > 0) {

      kx = (dx / d) * maxR;
      ky = (dy / d) * maxR;
    }

    setMiraOff({
      x: kx,
      y: ky,
    });

    // Zona morta da mira controlada pela sensibilidade (0..100): quanto maior a
    // sensibilidade, menor o movimento necessário para a mira "pegar".
    // sens 0 → 0.45 · sens 50 → 0.28 (padrão) · sens 100 → 0.11.
    const sens =
      sensibilidadeRef && typeof sensibilidadeRef.current === "number"
        ? sensibilidadeRef.current
        : 50;
    const zonaMorta = 0.45 - (sens / 100) * 0.34;

    if (d > maxR * zonaMorta) {

      aimRef.current = {
        active: true,
        ang: Math.atan2(dy, dx),
      };

    } else {

      aimRef.current = {
        active: false,
        ang: 0,
      };
    }
  };

  const miraInicio = (e) => {

    e.preventDefault();

    const el = miraBaseRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();

    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    if (
      Math.hypot(
        e.clientX - cx,
        e.clientY - cy
      ) >
      (r.width / 2) * 1.1
    )
      return;

    try {
      e.currentTarget.setPointerCapture(
        e.pointerId
      );
    } catch {}

    miraPointerRef.current = e.pointerId;

    miraAtualizar(
      e.clientX,
      e.clientY
    );
  };

  const miraMover = (e) => {

    if (
      miraPointerRef.current !==
      e.pointerId
    )
      return;

    miraAtualizar(
      e.clientX,
      e.clientY
    );
  };

  const miraFim = (e) => {

    if (
      miraPointerRef.current !==
      e.pointerId
    )
      return;

    miraPointerRef.current = null;

    setMiraOff({
      x: 0,
      y: 0,
    });

    aimRef.current = {
      active: false,
      ang: 0,
    };
  };

  return {

    menuDown,
    menuMove,
    menuUp,
    menuFimAnim,

    joyInicio,
    joyMover,
    joyFim,

    voarPress,
    voarRelease,

    miraInicio,
    miraMover,
    miraFim,
  };
}