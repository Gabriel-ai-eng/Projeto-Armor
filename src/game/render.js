// ============================================================
// PROJETO ARMOR · RENDER (o "cérebro": laço + desenho)  ⭐
// Equivale ao render.js do Free Kick World (aqui juntando o laço e o desenho).
// A cada frame ele: lê os controles (joysticks/voar), aplica a FÍSICA
// (andar/correr, pulo roteirizado, voo), ESCOLHE o sprite pelo estado do
// personagem e DESENHA tudo — céu por fase do dia, chão, personagem, mira,
// tiros/partículas e vinheta.
//
// Não tem estado próprio: recebe (deps) o contexto do canvas, o objeto do
// jogo (G) e os refs de entrada, e devolve { start, stop } para ligar/desligar
// o requestAnimationFrame.
// ============================================================
import {
  RENDER_SCALE, WORLD_W, ALT, ALTURA_ARMOR,
  VEL_ANDAR, VEL_CORRER, LIMIAR_CORRER, GRAV, FLY_THRUST, VY_MAX, VY_FALL, ALT_MAX,
  COOLDOWN_TIRO, VEL_TIRO, COOLDOWN_MISSIL, VEL_MISSIL, AZUL_RGB, OURO_RGB, NOITE, DIA, CREP,
} from './ajustes';
import {
  SPRITE_OLHA_PARA, FRAMES_ANDAR, FRAMES_CORRER, FRAME_PARADO, FRAMES_PARADO_ANIM,
  PARADO_FPS, PARADO_COLS, PARADO_ROWS, ANDAR_FRAMES_POR_TICK, PULAR_COLS, PULAR_ROWS, PULAR_FRAMES,
  PULAR_BODY_R, PULAR_FOOT_R, JUMP_ANIM_SPEED, FRAMES_AGACHAR, AGACHAR_VEL_TRANSICAO,
} from './sprites';
import { lerpArr, rgbStr, rgbaStr, jumpArc, faseDia } from './mundo';
import { criarCenario } from './cenario/desenhar';
import { Z_INICIAL, Z_MAX, AREA_CUBO } from './cenario/mapa';
import { resolverColisao, alturaSolo } from './cenario/colisao';
import { passosSetAtivo } from './som';

// deps: { ctx, canvas, G, imgsRef, zoomAlvoRef, relogioAtivoRef, solRef, moveRef, aimRef, volumeEfeitosRef }
export function criarLoop(deps) {
  const { ctx, canvas, G, imgsRef, zoomAlvoRef, relogioAtivoRef, solRef, moveRef, aimRef, vibracaoRef, volumeEfeitosRef } = deps;
  let raf;
  let cen = null;   // instância do cenário (criada quando os atlas chegam)

  const passo = () => {
    raf = requestAnimationFrame(passo);
    const g = G.current;
    const { andar, correr, cenario, emissivo, pular, parado, agachar, calibAndar, calibCorrer, calibParado, calibPular, calibAgachar } = imgsRef.current;
    if (!g || !andar || !cenario || !emissivo) return;
    if (!cen) cen = criarCenario({ tileset: cenario, emissivo });

    ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
    // Nearest neighbor: sem anti-aliasing ao desenhar as sprites, para os
    // pixels ficarem "crocantes" (pixel art nítida, sem borrão).
    ctx.imageSmoothingEnabled = false;
    const VW = canvas.width / RENDER_SCALE; g.t++;
    if (window.innerWidth <= window.innerHeight) return;
    // ===== INPUT (mover + mirar) — vem dos joysticks DOM (por imagem) =====
    const mv = moveRef.current, am = aimRef.current;
    const mx = mv.x, intensidade = mv.mag;
    const aimActive = am.active, aimAng = am.ang;

    // ===== FÍSICA HORIZONTAL =====
    const p = g.p;
    const correndo = intensidade > LIMIAR_CORRER;
    const velMax = correndo ? VEL_CORRER : VEL_ANDAR;
    const aceler = correndo ? 0.75 : 0.17;
    p.vx += mx * aceler; p.vx *= 0.85;
    // Zera só quando o manche está solto (mx===0) — zerar mesmo com o
    // manche inclinado travava o personagem em vx=0 pra sempre com toques
    // fracos/moderados: cada quadro somava só uma fração de aceler*mx (bem
    // menor que 0.05) e o corte devolvia a 0 antes de conseguir acumular,
    // então ele nunca saía do lugar por mais tempo que segurasse o manche.
    if (mx === 0 && Math.abs(p.vx) < 0.05) p.vx = 0;
    p.vx = Math.max(-velMax, Math.min(velMax, p.vx));
    const xAntes = p.x;
    p.x = Math.max(60, Math.min(WORLD_W - 60, p.x + p.vx));
    if (aimActive && Math.abs(Math.cos(aimAng)) > 0.25) p.face = Math.cos(aimAng) >= 0 ? 1 : -1;
    else if (Math.abs(p.vx) > 0.08) p.face = p.vx > 0 ? 1 : -1;

    // ===== PROFUNDIDADE (travada) =====
    // Estilo Terraria: o personagem só anda para os lados. O eixo vertical do
    // joystick não move mais "para dentro/fora" do hangar — joystick para
    // baixo (sem puxar muito para o lado) ativa o AGACHAR em vez disso. p.z
    // fica fixo no valor de nascimento.
    const mzJoy = mv.y || 0;
    p.agachado = mzJoy > 0.4 && mzJoy > Math.abs(mx);
    // Progresso do agachar (0 = de pé, FRAMES_AGACHAR-1 = totalmente agachado)
    // anda pra FRENTE enquanto o manche fica pro chão e pra TRÁS (mesma tira,
    // ao contrário) assim que ele volta pro centro — é o que faz o personagem
    // "levantar" com a animação em modo reverso em vez de só sumir o sprite.
    const agachaAlvo = p.agachado ? FRAMES_AGACHAR - 1 : 0;
    p.agachaF = p.agachaF ?? 0;
    if (p.agachaF < agachaAlvo) p.agachaF = Math.min(agachaAlvo, p.agachaF + AGACHAR_VEL_TRANSICAO);
    else if (p.agachaF > agachaAlvo) p.agachaF = Math.max(agachaAlvo, p.agachaF - AGACHAR_VEL_TRANSICAO);
    if (p.z === undefined) p.z = Z_INICIAL;
    resolverColisao(p);
    // Deslocamento REAL neste quadro — depois da colisão (não só do clamp da
    // borda do mundo): sem isso, esbarrar numa caixa/parede do cenário com o
    // manche todo inclinado mostrava "andar"/"correr" com o corpo empurrado
    // de volta pro mesmo lugar a cada quadro (vx>0 mas p.x sempre devolvido).
    const deslocouDeVerdade = Math.abs(p.x - xAntes) > 0.02;
    const solo = alturaSolo(p.x, p.z);   // apoio local: 0 = chão, >0 = em cima de algo

    // ===== FÍSICA VERTICAL (pulo roteirizado / voo) =====
    // Teto sólido do cubo: trava tanto o pulo (arco roteirizado) quanto o voo
    // livre — o Armor bate a cabeça no vidro de cima, igual bate nas paredes.
    const teto = Math.min(ALT_MAX, AREA_CUBO.maxY);
    if (g.flying && g.jump) g.jump = null;
    if (g.jump) {
      g.jump.f += JUMP_ANIM_SPEED;
      if (g.jump.f >= PULAR_FRAMES) { g.jump = null; p.y = solo; p.vy = 0; }
      else { p.y = Math.min(teto, (g.jump.base || 0) + jumpArc(g.jump.f)); p.vy = 0; }
    }
    if (!g.jump) {
      if (g.flying) p.vy += FLY_THRUST;
      p.vy -= GRAV;
      p.vy = Math.max(-VY_FALL, Math.min(VY_MAX, p.vy));
      p.y += p.vy;
      if (p.y <= solo) { p.y = solo; if (p.vy < 0) p.vy = 0; }
      if (p.y >= teto) { p.y = teto; if (p.vy > 0) p.vy = 0; }
    }

    // ===== ANIMAÇÃO =====
    const vAbs = Math.abs(p.vx);
    const emPulo = !!(g.jump && pular);
    let modo;
    if (emPulo) modo = 'pular';
    else if (p.y > solo + 3) modo = 'ar';
    // Continua em "agachado" enquanto p.agachaF > 0 mesmo depois de soltar o
    // manche — é o que deixa a animação de LEVANTAR (reverso da tira) tocar
    // até o fim antes de cair no parado/andar normal.
    else if (p.agachado || p.agachaF > 0) modo = 'agachado';
    // "parado" enquanto a bolinha do manche não sai de perto do centro —
    // olha pra intensidade BRUTA do manche (não pra vAbs, a velocidade já
    // suavizada por aceleração/atrito: um toque bem de leve podia nunca
    // passar do limiar e o personagem ficava "preso" no idle). O limiar
    // (0.18) precisa ser alto o bastante pra um toque leve/sem querer não
    // disparar a animação de andar sem o personagem realmente sair do
    // lugar. E mesmo com o manche bem inclinado, só entra "andar"/"correr"
    // se ele REALMENTE se deslocou nesse quadro — sem isso, encostado numa
    // parede/borda do mundo (vx não-nulo mas p.x travado no clamp) ele
    // ficava "andando" parado no mesmo lugar.
    else if (intensidade < 0.18 || !deslocouDeVerdade) modo = 'parado';
    else if (correndo) modo = 'correr';
    else modo = 'andar';
    
    if (modo === 'andar' && p.modo !== 'andar') p.animT = 0;
    p.modo = modo;

    // Som de passos: só toca quando ele REALMENTE anda/corre (mesma condição
    // da animação acima) — sem tremer/"patinar" perto de paredes nem em
    // toques leves no manche.
    passosSetAtivo(modo === 'andar' || modo === 'correr', volumeEfeitosRef?.current);

    let sprite, calib, nFrames, frameAtual;
    if (emPulo) {
      // Pulo desenhado abaixo
    } else if (modo === 'correr' && correr) {
      sprite = correr; calib = calibCorrer; nFrames = FRAMES_CORRER;
      // Suaviza a velocidade usada na animação (média móvel) para evitar saltos
      // bruscos de quadro quando vAbs oscila — deixa a corrida mais fluida.
      p.animVCorrer = (p.animVCorrer ?? vAbs) + (vAbs - (p.animVCorrer ?? vAbs)) * 0.3;
      // FIX DE VELOCIDADE: mais rápida que antes (0.07 -> 0.1)
      p.animT += p.animVCorrer * 0.1;
      frameAtual = Math.floor(p.animT) % nFrames;
    } else if (modo === 'andar') {
      sprite = andar; calib = calibAndar; nFrames = FRAMES_ANDAR;

      // FIX DE VELOCIDADE: multiplicador mais rápido que antes (0.85 -> 1.1).
      p.animT += (ANDAR_FRAMES_POR_TICK * 1.1);

      frameAtual = 1 + (Math.floor(p.animT) % (FRAMES_ANDAR - 1));
    } else if (modo === 'agachado' && agachar) {
      // Quadro = o progresso calculado acima (p.agachaF): sobe a tira ao
      // agachar, desce (reverso) ao levantar — nada de loop por tempo aqui.
      sprite = agachar; calib = calibAgachar; nFrames = FRAMES_AGACHAR;
      frameAtual = Math.min(nFrames - 1, Math.round(p.agachaF));
    } else if (parado) {
      sprite = parado; calib = calibParado; nFrames = FRAMES_PARADO_ANIM;
      // Ignora só o 1º quadro da folha (índice 0) — os demais entram todos,
      // na ordem, em loop.
      p.idleT = (p.idleT || 0) + PARADO_FPS / 60;
      frameAtual = 1 + (Math.floor(p.idleT) % (FRAMES_PARADO_ANIM - 1));
    } else {
      sprite = andar; calib = calibAndar; nFrames = FRAMES_ANDAR; frameAtual = FRAME_PARADO; 
    }

    // ===== CÂMERA =====
    const zAlvo = zoomAlvoRef.current;
    const perto = zAlvo > 1.001;
    const fyAlvo = (perto ? -(ALTURA_ARMOR * 0.5) : -(ALT * 0.22)) - p.y;
    const halfW = VW / (2 * g.zoom);
    // Arrastar a tela (fora do manche/mira, ver controles.js) desloca a
    // câmera livremente para os lados, por cima do acompanhamento automático
    // do personagem — camPanX vem em px de tela, convertido pra unidades do
    // mundo pelo zoom atual (1 dedo = 1px de tela = 1/zoom unidades).
    let fxAlvo = p.x + (g.camPanX || 0) / g.zoom;
    const minFx = halfW, maxFx = WORLD_W - halfW;
    fxAlvo = (maxFx > minFx) ? Math.max(minFx, Math.min(maxFx, fxAlvo)) : WORLD_W / 2;
    g.zoom += (zAlvo - g.zoom) * 0.08;
    g.fx += (fxAlvo - g.fx) * 0.2;
    g.fy += (fyAlvo - g.fy) * 0.1;
    const Z = g.zoom, fx = g.fx, fy = g.fy, halfWNow = VW / (2 * Z);

    // ===== FASE DO DIA =====
    // (o sol/lua não são mais desenhados — dentro do hangar a fase do dia
    //  entra pela COR das janelas e pela luz ambiente do cenário)
    let lum = 0, twi = 0;
    if (relogioAtivoRef.current) {
      const now = new Date();
      const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
      const { sr, ss } = solRef.current;
      const ph = faseDia(h, sr, ss); lum = ph.lum; twi = ph.twi;
    }

    // Cor do "céu" vista pelos VIDROS das janelas do hangar (segue a fase do
    // dia do relógio, como o céu antigo — ver grupo `janelas` em luzes.js).
    const corCeu = rgbStr(lerpArr(lerpArr(NOITE[1], DIA[1], lum), CREP[1], twi * 0.55));

    // ===== MUNDO sob a câmera — HANGAR em camadas (src/game/cenario/) =====
    ctx.save();
    ctx.translate(VW / 2, ALT / 2); ctx.scale(Z, Z); ctx.translate(-fx, -fy);

    const leftW = fx - halfWNow - 60, rightW = fx + halfWNow + 60;
    // Fundo e piso — com as luzes de cada plano DESENHADAS JUNTO, para nada
    // do cenário de trás (linha do rodapé, lâmpadas…) cobrir o personagem
    cen.desenharFundo(ctx, leftW, rightW);                        // parede, colunas, janelas, lâmpadas
    cen.desenharLuzes(ctx, leftW, rightW, g.t, corCeu, 'fundo');  // luz das janelas/lâmpadas
    cen.desenharChao(ctx, leftW, rightW);                         // piso
    cen.desenharLuzes(ctx, leftW, rightW, g.t, corCeu, 'chao');   // linha do rodapé, reflexos

    // Pés do personagem: profundidade no piso (z) menos a altura (pulo/voo)
    const corpoY = p.z - p.y;
    // Perspectiva sutil: mais "fundo" (z menor) = levemente menor
    const alturaCorpo = ALTURA_ARMOR * (0.9 + (p.z / Z_MAX) * 0.2);

    // PROJETO ARMOR — o desenho vira uma função para entrar no depth sorting
    // (objetos do cenário e personagem ordenados pelo z da base).
    const flip = (p.face === 1) !== (SPRITE_OLHA_PARA === 'direita');
    const desenharPersonagem = () => {
    if (emPulo) {
      const jFrame = Math.min(Math.floor(g.jump.f), PULAR_FRAMES - 1);
      const cw = pular.width / PULAR_COLS, ch = pular.height / PULAR_ROWS;
      const col = jFrame % PULAR_COLS, row = Math.floor(jFrame / PULAR_COLS);
      // calibPular: âncora por quadro (centro de massa + base suavizada) e
      // escala fixa pela altura em pé — ver carregarSprites.js, onde o tremor
      // do voo é tratado. Sem ela, corte fixo.
      let esc, footGap, offXPulo = 0;
      if (calibPular) {
        esc = alturaCorpo / (calibPular.corpoR * ch);
        const f = calibPular.frames[jFrame];
        footGap = (1 - f.botR) * ch * esc; offXPulo = (0.5 - f.cxR) * cw * esc;
      } else {
        esc = alturaCorpo / (PULAR_BODY_R * ch);
        footGap = PULAR_FOOT_R * ch * esc;
      }
      const destW = cw * esc, destH = ch * esc;
      const mt = ctx.getTransform();
      const ax = Math.round(mt.a * p.x + mt.c * corpoY + mt.e);
      const ay = Math.round(mt.b * p.x + mt.d * corpoY + mt.f);
      const sEff = Z * RENDER_SCALE;
      const dW = Math.round(destW * sEff), dH = Math.round(destH * sEff);
      const dGap = Math.round(footGap * sEff);
      const dOffX = Math.round(offXPulo * sEff);
      ctx.save();
      ctx.setTransform(flip ? -1 : 1, 0, 0, 1, ax, ay);
      ctx.imageSmoothingEnabled = false; // sem suavização no pulo: sprite mais nítida
      ctx.drawImage(pular, Math.round(col * cw), Math.round(row * ch), Math.round(cw), Math.round(ch), -Math.round(dW / 2) + dOffX, -dH + dGap, dW, dH);
      ctx.restore();
    } else if (sprite === parado) {
      // IDLE em GRADE (colunas x linhas), igual ao pulo — a folha nova veio
      // em grade em vez de tira horizontal (ver carregarSprites.js).
      const cw = sprite.width / PARADO_COLS, ch = sprite.height / PARADO_ROWS;
      const col = frameAtual % PARADO_COLS, row = Math.floor(frameAtual / PARADO_COLS);
      let esc, gapPes = 0, offX = 0;
      if (calib) {
        esc = alturaCorpo / (calib.corpoR * ch);
        const f = calib.frames[frameAtual];
        gapPes = (1 - f.botR) * ch * esc; offX = (0.5 - f.cxR) * cw * esc;
      } else esc = alturaCorpo / ch;
      const destW = cw * esc, destH = ch * esc;
      const mt = ctx.getTransform();
      const ax = Math.round(mt.a * p.x + mt.c * corpoY + mt.e);
      const ay = Math.round(mt.b * p.x + mt.d * corpoY + mt.f);
      const sEff = Z * RENDER_SCALE;
      const dW = Math.round(destW * sEff), dH = Math.round(destH * sEff);
      const dOffX = Math.round(offX * sEff), dGap = Math.round(gapPes * sEff);
      ctx.save();
      ctx.setTransform(flip ? -1 : 1, 0, 0, 1, ax, ay);
      ctx.imageSmoothingEnabled = false; // sem suavização no idle: sprite mais nítida (igual ao pulo)
      ctx.drawImage(sprite, Math.round(col * cw), Math.round(row * ch), Math.round(cw), Math.round(ch), -Math.round(dW / 2) + dOffX, -dH + dGap, dW, dH);
      ctx.restore();
    } else {
      const fw = sprite.width / nFrames, fh = sprite.height;
      let escala, gapPes = 0, offX = 0;
      if (calib) {
        escala = alturaCorpo / (calib.corpoR * fh);
        const f = calib.frames[frameAtual];
        gapPes = (1 - f.botR) * fh * escala; offX = (0.5 - f.cxR) * fw * escala;
      } else escala = alturaCorpo / fh;
      const destW = fw * escala, destH = fh * escala;
      const mt = ctx.getTransform();
      const ax = Math.round(mt.a * p.x + mt.c * corpoY + mt.e);
      const ay = Math.round(mt.b * p.x + mt.d * corpoY + mt.f);
      const sEff = Z * RENDER_SCALE;                 
      const dW = Math.round(destW * sEff), dH = Math.round(destH * sEff);
      const dOffX = Math.round(offX * sEff), dGap = Math.round(gapPes * sEff);
      ctx.save();
      ctx.setTransform(flip ? -1 : 1, 0, 0, 1, ax, ay);
      ctx.drawImage(sprite, Math.round(frameAtual * fw), 0, Math.round(fw), fh, -Math.round(dW / 2) + dOffX, -dH + dGap, dW, dH);
      ctx.restore();
    }
    };  // fim de desenharPersonagem

    // ===== DEPTH SORTING =====
    // Objetos do cenário (e as luzes presas a eles, como cubo/plataforma) +
    // personagem, ordenados pelo z da base (menor z = mais ao fundo, desenha
    // antes) — é o que deixa o personagem ficar ATRÁS das caixas/plataforma
    // ou NA FRENTE delas conforme anda pelo piso, sem nada cobri-lo por erro.
    const itens = cen.itensProfundidade();
    itens.push({ z: p.z, desenhar: desenharPersonagem });
    itens.sort((a, b) => a.z - b.z);
    for (const it of itens) it.desenhar(ctx, g.t, corCeu);

    cen.desenharFrente(ctx, leftW, rightW);   // camada "frente"

    // ===== MIRA =====
    const ox = p.x + p.face * 4, oy = corpoY - alturaCorpo * 0.55;
    if (aimActive) {
      const ex = ox + Math.cos(aimAng) * 120, ey = oy + Math.sin(aimAng) * 120;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgbaStr(AZUL_RGB, 0.35); ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = rgbaStr(AZUL_RGB, 0.8); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(ex, ey, 7, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex, ey, 1.6, 0, 7); ctx.stroke();
      const ch = ctx.createRadialGradient(ox, oy, 1, ox, oy, 12);
      ch.addColorStop(0, rgbaStr(AZUL_RGB, 0.6)); ch.addColorStop(1, rgbaStr(AZUL_RGB, 0));
      ctx.fillStyle = ch; ctx.fillRect(ox - 12, oy - 12, 24, 24);
      ctx.globalCompositeOperation = 'source-over';
    }

    // ===== ARMA =====
    if (g.tiroCd > 0) g.tiroCd--;
    const dir = aimActive ? { x: Math.cos(aimAng), y: Math.sin(aimAng) } : { x: p.face, y: 0 };
    if (aimActive && g.tiroCd <= 0) {
      g.projeteis.push({ tipo: 'tiro', x: ox + dir.x * 12, y: oy + dir.y * 12, vx: dir.x * VEL_TIRO, vy: dir.y * VEL_TIRO, vida: 90 });
      g.tiroCd = COOLDOWN_TIRO;
      if (g.projeteis.length > 90) g.projeteis.shift();
      // Vibração ao atirar (preferência do painel de Configurações).
      if (vibracaoRef && vibracaoRef.current && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(12);
      }
    }

    // ===== GOLPE (botão LUTAR) — rajada dourada, mais forte que o tiro =====
    if (g.missilCd > 0) g.missilCd--;
    if (g.missilQueued && g.missilCd <= 0) {
      g.projeteis.push({ tipo: 'missil', x: ox + dir.x * 12, y: oy + dir.y * 12, vx: dir.x * VEL_MISSIL, vy: dir.y * VEL_MISSIL, vida: 140 });
      g.missilCd = COOLDOWN_MISSIL;
      if (g.projeteis.length > 90) g.projeteis.shift();
      if (vibracaoRef && vibracaoRef.current && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(22);
      }
    }
    g.missilQueued = false;

    ctx.globalCompositeOperation = 'lighter';
    for (let i = g.projeteis.length - 1; i >= 0; i--) {
      const pr = g.projeteis[i];
      pr.x += pr.vx; pr.y += pr.vy; pr.vida--;
      if (pr.tipo === 'tiro') {
        const gl = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, 9);
        gl.addColorStop(0, rgbaStr([220, 245, 255], 0.95)); gl.addColorStop(1, rgbaStr(AZUL_RGB, 0));
        ctx.fillStyle = gl; ctx.fillRect(pr.x - 9, pr.y - 9, 18, 18);
        ctx.strokeStyle = rgbaStr([235, 250, 255], 0.9); ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x - pr.vx * 0.5, pr.y - pr.vy * 0.5); ctx.stroke();
      } else {
        g.particulas.push({ x: pr.x - pr.vx * 0.4, y: pr.y - pr.vy * 0.4, vida: 1, ouro: Math.random() < 0.6 });
        const gl = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, 13);
        gl.addColorStop(0, rgbaStr([255, 220, 150], 0.95)); gl.addColorStop(1, rgbaStr(OURO_RGB, 0));
        ctx.fillStyle = gl; ctx.fillRect(pr.x - 13, pr.y - 13, 26, 26);
        ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(Math.atan2(pr.vy, pr.vx));
        ctx.fillStyle = rgbStr(OURO_RGB); ctx.fillRect(-6, -2.4, 12, 4.8);
        ctx.restore();
      }
      if (pr.vida <= 0 || Math.abs(pr.x - p.x) > 1700) g.projeteis.splice(i, 1);
    }
    
    for (let i = g.particulas.length - 1; i >= 0; i--) {
      const q = g.particulas[i]; q.vida -= 0.06;
      if (q.vida <= 0) { g.particulas.splice(i, 1); continue; }
      ctx.fillStyle = rgbaStr(q.ouro ? OURO_RGB : AZUL_RGB, q.vida * 0.7);
      ctx.beginPath(); ctx.arc(q.x, q.y, 2 * q.vida + 0.5, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();

    // ===== LUZ AMBIENTE (véu do cenário; presets em cenario/luzes.js) =====
    cen.desenharAmbiente(ctx, VW, ALT, lum);

    // ===== VINHETA =====
    const vin = ctx.createRadialGradient(VW / 2, ALT / 2, ALT * 0.45, VW / 2, ALT / 2, ALT * 0.95);
    vin.addColorStop(0, 'rgba(0,0,0,0)'); vin.addColorStop(1, `rgba(0,0,0,${0.42 * (1 - lum * 0.5)})`);
    ctx.fillStyle = vin; ctx.fillRect(0, 0, VW, ALT);
  };

  return {
    start: () => { raf = requestAnimationFrame(passo); },
    stop: () => cancelAnimationFrame(raf),
  };
}