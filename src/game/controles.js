// ============================================================
// PROJETO ARMOR · CONTROLES (input do jogador)
// ============================================================
import { alturaSolo } from './cenario/colisao';
import { ZOOM_PERTO } from './ajustes';
import { tocarBip } from './som';

const ZOOM_LONGE = 1; // limite inferior do zoom (mesmo valor usado quando zoomPerto=false)

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// ==========================================================
// GESTOS DE CÂMERA (arrastar pros lados + pinça pra zoom)
// Vivem fora do manche/mira: qualquer toque que caia na joyZona/miraZona mas
// FORA do raio de ativação do respectivo manche vira gesto de câmera, em vez
// de ser descartado. Os ponteiros ficam num Map compartilhado em G.current
// (camPointers) — assim um dedo na zona esquerda e outro na direita (pinça
// com os dois polegares) se combinam num único gesto de 2 pontos.
// ==========================================================

function camPointerDown(g, id, x, y) {
  if (!g) return;
  if (!g.camPointers) g.camPointers = new Map();
  g.camPointers.set(id, { x, y });
  camReancorar(g);
}

function camPointerMove(g, id, x, y, zoomAlvoRef) {
  if (!g || !g.camPointers || !g.camPointers.has(id)) return;
  g.camPointers.set(id, { x, y });
  camAtualizar(g, zoomAlvoRef);
}

function camPointerUp(g, id) {
  if (!g || !g.camPointers) return;
  g.camPointers.delete(id);
  camReancorar(g); // re-ancora com o(s) ponteiro(s) que sobrou(aram)
}

// Fixa um novo ponto de partida sempre que o número de dedos muda (1 = pan,
// 2 = pinça) — evita "pulo" da câmera/zoom na troca de modo.
function camReancorar(g) {
  const pts = Array.from(g.camPointers.values());
  if (pts.length === 1) {
    g.camAncora = { tipo: 'pan', x0: pts[0].x, pan0: g.camPanX || 0 };
  } else if (pts.length === 2) {
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
    g.camAncora = { tipo: 'pinch', dist0: dist, zoom0: g.zoom || 1 };
  } else {
    g.camAncora = null;
  }
}

function camAtualizar(g, zoomAlvoRef) {
  const a = g.camAncora;
  if (!a) return;
  const pts = Array.from(g.camPointers.values());
  if (a.tipo === 'pan' && pts.length === 1) {
    g.camPanX = a.pan0 + (pts[0].x - a.x0);
  } else if (a.tipo === 'pinch' && pts.length === 2) {
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
    const alvo = clamp(a.zoom0 * (dist / a.dist0), ZOOM_LONGE, ZOOM_PERTO);
    if (zoomAlvoRef) zoomAlvoRef.current = alvo;
  }
}

export function criarControles(deps) {
  const {
    setKnobOff,
    setMiraOff,
    setVoarAtivo,
    setLutarAtivo,

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

    sensibilidadeRef, // sensibilidade da mira (0..100) vinda das Configurações

    zoomAlvoRef, // alvo do zoom (câmera) — a pinça ajusta isso, travado em [1, ZOOM_PERTO]

    volumeEfeitosRef // "Volume dos efeitos" — bip ao clicar nos botões da tela inicial
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

  // Abaixo deste tanto de deslocamento (px), o toque conta como "parado":
  // telas sensíveis ao toque relatam vários eventos pointermove com um leve
  // tremor mesmo quando o dedo não sai do lugar. Sem essa margem, esse tremor
  // batia em `botaoSobPonto` como se fosse outro botão vizinho, marcava
  // `vagou = true` e o `menuUp` descartava o toque silenciosamente — por isso
  // era preciso tocar várias vezes até um toque "sortudo" sem tremor.
  const LIMIAR_ARRASTO_MENU = 14;

  const menuDown = (e, id) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);

    arrastoMenuRef.current = {
      ativo: true,
      atual: id,
      inicio: id,
      vagou: false,
      x0: e.clientX,
      y0: e.clientY,
    };

    acenderBotao(id);
  };

  const menuMove = (e) => {
    const d = arrastoMenuRef.current;

    if (!d.ativo) return;

    const dist = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
    if (dist < LIMIAR_ARRASTO_MENU) return;

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

      tocarBip(volumeEfeitosRef?.current);

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
      // eixo vertical do joystick: move o personagem na PROFUNDIDADE do piso
      // (para dentro/fora do hangar) — usado pelo depth sorting do cenário
      y: dy / maxR,
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
    ) {
      // Fora do alcance do manche: em vez de descartar o toque, vira gesto
      // de câmera (arrastar pro lado sozinho, ou pinça se juntar com outro
      // dedo — inclusive um vindo da miraZona do outro lado da tela).
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      camPointerDown(G.current, e.pointerId, e.clientX, e.clientY);
      return;
    }

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
    ) {
      camPointerMove(G.current, e.pointerId, e.clientX, e.clientY, zoomAlvoRef);
      return;
    }

    joyAtualizar(
      e.clientX,
      e.clientY
    );
  };

  const joyFim = (e) => {

    if (
      joyPointerRef.current !==
      e.pointerId
    ) {
      camPointerUp(G.current, e.pointerId);
      return;
    }

    joyPointerRef.current = null;

    setKnobOff({
      x: 0,
      y: 0,
    });

    moveRef.current = {
      x: 0,
      y: 0,
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

      } else if (g.p.y <= alturaSolo(g.p.x, g.p.z ?? 0) + 2 && !g.jump) {

        // `base` = altura do apoio no momento do salto (chão ou o topo de
        // uma caixa/plataforma do cenário) — o arco do pulo parte dela
        g.jump = {
          f: 0,
          base: alturaSolo(g.p.x, g.p.z ?? 0),
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
  // BOTÃO LUTAR (golpe/rajada dourada — dispara o "missil" reservado
  // no estado do jogo; o cooldown e o disparo em si vivem no render.js)
  // ==========================================================

  const lutarPress = (e) => {

    e.preventDefault();

    try {
      e.currentTarget.setPointerCapture(
        e.pointerId
      );
    } catch {}

    const g = G.current;
    if (g) g.missilQueued = true;

    setLutarAtivo(true);
  };

  const lutarRelease = () => {
    setLutarAtivo(false);
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
    ) {
      // Fora do alcance da mira: mesma ideia da joyZona — vira gesto de
      // câmera em vez de ser descartado.
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      camPointerDown(G.current, e.pointerId, e.clientX, e.clientY);
      return;
    }

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
    ) {
      camPointerMove(G.current, e.pointerId, e.clientX, e.clientY, zoomAlvoRef);
      return;
    }

    miraAtualizar(
      e.clientX,
      e.clientY
    );
  };

  const miraFim = (e) => {

    if (
      miraPointerRef.current !==
      e.pointerId
    ) {
      camPointerUp(G.current, e.pointerId);
      return;
    }

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

    lutarPress,
    lutarRelease,

    miraInicio,
    miraMover,
    miraFim,
  };
}