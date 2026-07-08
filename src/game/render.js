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
  RENDER_SCALE, WORLD_W, ALT, ALTURA_ARMOR, ALTURA_IMG_CHAO, LINHA_PES,
  VEL_ANDAR, VEL_CORRER, LIMIAR_CORRER, GRAV, FLY_THRUST, VY_MAX, VY_FALL, ALT_MAX,
  COOLDOWN_TIRO, VEL_TIRO, AZUL_RGB, OURO_RGB, NOITE, DIA, CREP,
} from './ajustes';
import {
  SPRITE_OLHA_PARA, FRAMES_ANDAR, FRAMES_CORRER, FRAME_PARADO, FRAMES_PARADO_ANIM,
  PARADO_FPS, ANDAR_FRAMES_POR_TICK, PULAR_COLS, PULAR_ROWS, PULAR_FRAMES,
  PULAR_BODY_R, PULAR_FOOT_R, JUMP_ANIM_SPEED,
} from './sprites';
import { lerpArr, rgbStr, rgbaStr, jumpArc, faseDia } from './mundo';

// deps: { ctx, canvas, G, imgsRef, zoomAlvoRef, relogioAtivoRef, solRef, moveRef, aimRef }
export function criarLoop(deps) {
  const { ctx, canvas, G, imgsRef, zoomAlvoRef, relogioAtivoRef, solRef, moveRef, aimRef } = deps;
  let raf;

  const passo = () => {
    raf = requestAnimationFrame(passo);
    const g = G.current;
    const { andar, correr, chao, pular, parado, calibAndar, calibCorrer, calibParado, chaoCalib } = imgsRef.current;
    if (!g || !andar || !chao) return;

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
    if (Math.abs(p.vx) < 0.05) p.vx = 0;
    p.vx = Math.max(-velMax, Math.min(velMax, p.vx));
    p.x = Math.max(60, Math.min(WORLD_W - 60, p.x + p.vx));
    if (aimActive && Math.abs(Math.cos(aimAng)) > 0.25) p.face = Math.cos(aimAng) >= 0 ? 1 : -1;
    else if (Math.abs(p.vx) > 0.08) p.face = p.vx > 0 ? 1 : -1;

    // ===== FÍSICA VERTICAL (pulo roteirizado / voo) =====
    if (g.flying && g.jump) g.jump = null;            
    if (g.jump) {
      g.jump.f += JUMP_ANIM_SPEED;
      if (g.jump.f >= PULAR_FRAMES) { g.jump = null; p.y = 0; p.vy = 0; }
      else { p.y = jumpArc(g.jump.f); p.vy = 0; }
    }
    if (!g.jump) {
      if (g.flying) p.vy += FLY_THRUST;
      p.vy -= GRAV;
      p.vy = Math.max(-VY_FALL, Math.min(VY_MAX, p.vy));
      p.y += p.vy;
      if (p.y <= 0) { p.y = 0; if (p.vy < 0) p.vy = 0; }
      if (p.y >= ALT_MAX) { p.y = ALT_MAX; if (p.vy > 0) p.vy = 0; }
    }

    // ===== ANIMAÇÃO =====
    const vAbs = Math.abs(p.vx);
    const emPulo = !!(g.jump && pular);
    let modo;
    if (emPulo) modo = 'pular';
    else if (p.y > 3) modo = 'ar';
    else if (vAbs < 0.06) modo = 'parado';
    else if (vAbs > VEL_ANDAR) modo = 'correr';
    else modo = 'andar';
    
    if (modo === 'andar' && p.modo !== 'andar') p.animT = 0;
    p.modo = modo;

    let sprite, calib, nFrames, frameAtual;
    if (emPulo) {
      // Pulo desenhado abaixo
    } else if (modo === 'correr' && correr) {
      sprite = correr; calib = calibCorrer; nFrames = FRAMES_CORRER;
      // FIX DE VELOCIDADE: Reduzido o multiplicador de 0.07 para 0.035 para dar peso à corrida
      p.animT += vAbs * 0.035; 
      frameAtual = Math.floor(p.animT) % nFrames;
    } else if (modo === 'andar') {
      sprite = andar; calib = calibAndar; nFrames = FRAMES_ANDAR;
      
      // FIX DE VELOCIDADE: Multiplicamos o avanço do frame por 0.45.
      // Isso reduz a velocidade da animação em mais da metade, removendo 
      // o efeito "patinação" e dando um passo mais robótico e natural.
      p.animT += (ANDAR_FRAMES_POR_TICK * 0.45);
      
      frameAtual = 1 + (Math.floor(p.animT) % (FRAMES_ANDAR - 1));

      // IGNORANDO O FRAME 18:
      if (frameAtual === 18) {
        p.animT += 1;
        frameAtual = 1 + (Math.floor(p.animT) % (FRAMES_ANDAR - 1));
      }

    } else if (parado) {
      sprite = parado; calib = calibParado; nFrames = FRAMES_PARADO_ANIM;
      p.idleT = (p.idleT || 0) + PARADO_FPS / 60;
      frameAtual = Math.floor(p.idleT) % FRAMES_PARADO_ANIM;
    } else { 
      sprite = andar; calib = calibAndar; nFrames = FRAMES_ANDAR; frameAtual = FRAME_PARADO; 
    }

    // ===== CÂMERA =====
    const zAlvo = zoomAlvoRef.current;
    const perto = zAlvo > 1.001;
    const fyAlvo = (perto ? -(ALTURA_ARMOR * 0.5) : -(ALT * 0.22)) - p.y;
    const halfW = VW / (2 * g.zoom);
    let fxAlvo = p.x;
    const minFx = halfW, maxFx = WORLD_W - halfW;
    fxAlvo = (maxFx > minFx) ? Math.max(minFx, Math.min(maxFx, fxAlvo)) : WORLD_W / 2;
    g.zoom += (zAlvo - g.zoom) * 0.08;
    g.fx += (fxAlvo - g.fx) * 0.2;
    g.fy += (fyAlvo - g.fy) * 0.1;
    const Z = g.zoom, fx = g.fx, fy = g.fy, halfWNow = VW / (2 * Z);

    // ===== FASE DO DIA =====
    let lum = 0, twi = 0, sunX = 0, sunY = 0, sunArc = 0;
    if (relogioAtivoRef.current) {
      const now = new Date();
      const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
      const { sr, ss } = solRef.current;
      const ph = faseDia(h, sr, ss); lum = ph.lum; twi = ph.twi;
      let pSun = (ss > sr) ? (h - sr) / (ss - sr) : 0.5;
      pSun = Math.max(0, Math.min(1, pSun));
      sunArc = Math.sin(pSun * Math.PI); sunX = VW * (0.12 + 0.76 * pSun); sunY = 190 - sunArc * 135;
    }

    // ===== CÉU =====
    const top = lerpArr(lerpArr(NOITE[0], DIA[0], lum), CREP[0], twi * 0.5);
    const mid = lerpArr(lerpArr(NOITE[1], DIA[1], lum), CREP[1], twi * 0.55);
    const bot = lerpArr(lerpArr(NOITE[2], DIA[2], lum), CREP[2], twi * 0.6);
    const ceu = ctx.createLinearGradient(0, 0, 0, ALT);
    ceu.addColorStop(0, rgbStr(top)); ceu.addColorStop(0.55, rgbStr(mid)); ceu.addColorStop(1, rgbStr(bot));
    ctx.fillStyle = ceu; ctx.fillRect(0, 0, VW, ALT);

    for (let i = 0; i < 60; i++) {
      const px = (((i * 137 + 53) - fx * 0.12) % (VW + 40) + VW + 40) % (VW + 40) - 20;
      const py = (i * 71 + 23) % (ALT * 0.55);
      ctx.globalAlpha = (0.25 + ((i + g.t * 0.02) % 3) * 0.2) * (1 - lum);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(px, py, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;

    if (lum > 0.01) {
      const sunCol = lerpArr([255, 154, 77], [255, 243, 200], sunArc);
      ctx.globalAlpha = lum;
      const haloS = ctx.createRadialGradient(sunX, sunY, 3, sunX, sunY, 80);
      haloS.addColorStop(0, rgbaStr(sunCol, 0.9)); haloS.addColorStop(1, rgbaStr([255, 180, 90], 0));
      ctx.fillStyle = haloS; ctx.fillRect(sunX - 80, sunY - 80, 160, 160);
      ctx.fillStyle = rgbStr(sunCol); ctx.beginPath(); ctx.arc(sunX, sunY, 15, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    const moonA = 1 - lum;
    if (moonA > 0.01) {
      const luaX = VW * 0.78 - fx * 0.05, luaY = 70;
      ctx.globalAlpha = moonA;
      const haloL = ctx.createRadialGradient(luaX, luaY, 4, luaX, luaY, 60);
      haloL.addColorStop(0, 'rgba(190,215,255,0.55)'); haloL.addColorStop(1, 'rgba(190,215,255,0)');
      ctx.fillStyle = haloL; ctx.fillRect(luaX - 60, luaY - 60, 120, 120);
      ctx.fillStyle = '#DCE8FF'; ctx.beginPath(); ctx.arc(luaX, luaY, 13, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    const m1 = rgbStr(lerpArr([13, 20, 40], [42, 74, 110], lum * 0.7));
    const m2 = rgbStr(lerpArr([20, 30, 56], [58, 90, 128], lum * 0.7));
    ctx.fillStyle = m1; ctx.beginPath(); ctx.moveTo(0, ALT);
    for (let x = 0; x <= VW; x += 14) { const wx = x + fx * 0.25; ctx.lineTo(x, 215 + 38 * Math.sin(wx * 0.011) + 14 * Math.sin(wx * 0.031)); }
    ctx.lineTo(VW, ALT); ctx.fill();
    ctx.fillStyle = m2; ctx.beginPath(); ctx.moveTo(0, ALT);
    for (let x = 0; x <= VW; x += 12) { const wx = x + fx * 0.4; ctx.lineTo(x, 258 + 30 * Math.sin(wx * 0.014 + 2)); }
    ctx.lineTo(VW, ALT); ctx.fill();

    // ===== MUNDO sob a câmera =====
    ctx.save();
    ctx.translate(VW / 2, ALT / 2); ctx.scale(Z, Z); ctx.translate(-fx, -fy);

    const ghW = ALTURA_IMG_CHAO, gwW = chao.width * (ghW / chao.height);
    const topR = chaoCalib ? chaoCalib.topR : 0, botR = chaoCalib ? chaoCalib.botR : 1;
    const dyImg = -topR * ghW, visH = (botR - topR) * ghW, superficie = visH * LINHA_PES;

    const leftW = fx - halfWNow - 60, rightW = fx + halfWNow + 60;
    ctx.fillStyle = (chaoCalib && chaoCalib.cor) ? chaoCalib.cor : '#0A0F1A';
    ctx.fillRect(leftW, visH - 1, rightW - leftW, 800);
    const x0 = Math.floor(leftW / gwW) * gwW;
    for (let x = x0; x < rightW; x += gwW) ctx.drawImage(chao, x, dyImg, gwW, ghW);
    if (lum > 0.01) { ctx.fillStyle = rgbaStr([170, 200, 230], lum * 0.1); ctx.fillRect(leftW, dyImg, rightW - leftW, ghW + 300); }

    const corpoY = superficie - p.y;            

    // PROJETO ARMOR
    const flip = (p.face === 1) !== (SPRITE_OLHA_PARA === 'direita');
    if (emPulo) {
      const jFrame = Math.min(Math.floor(g.jump.f), PULAR_FRAMES - 1);
      const cw = pular.width / PULAR_COLS, ch = pular.height / PULAR_ROWS;
      const col = jFrame % PULAR_COLS, row = Math.floor(jFrame / PULAR_COLS);
      const esc = ALTURA_ARMOR / (PULAR_BODY_R * ch);
      const destW = cw * esc, destH = ch * esc, footGap = PULAR_FOOT_R * ch * esc;
      const mt = ctx.getTransform();
      const ax = Math.round(mt.a * p.x + mt.c * corpoY + mt.e);
      const ay = Math.round(mt.b * p.x + mt.d * corpoY + mt.f);
      const sEff = Z * RENDER_SCALE;
      const dW = Math.round(destW * sEff), dH = Math.round(destH * sEff);
      const dGap = Math.round(footGap * sEff);
      ctx.save();
      ctx.setTransform(flip ? -1 : 1, 0, 0, 1, ax, ay);
      ctx.drawImage(pular, Math.round(col * cw), Math.round(row * ch), Math.round(cw), Math.round(ch), -Math.round(dW / 2), -dH + dGap, dW, dH);
      ctx.restore();
    } else {
      const fw = sprite.width / nFrames, fh = sprite.height;
      let escala, gapPes = 0, offX = 0;
      if (calib) {
        escala = ALTURA_ARMOR / (calib.corpoR * fh);
        const f = calib.frames[frameAtual];
        gapPes = (1 - f.botR) * fh * escala; offX = (0.5 - f.cxR) * fw * escala;
      } else escala = ALTURA_ARMOR / fh;
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

    // ===== MIRA =====
    const ox = p.x + p.face * 4, oy = corpoY - ALTURA_ARMOR * 0.55;
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
    }

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