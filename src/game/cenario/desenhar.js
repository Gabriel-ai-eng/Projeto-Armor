// ============================================================
// CENÁRIO · DESENHO (camadas + profundidade + luz dinâmica)
// Recebe os dois atlas carregados e devolve as funções que o render chama,
// na ordem: fundo → chão → [objetos + personagem, ordenados por z] → frente
// → luzes (emissivos com tint em tempo real) → ambiente.
//
// O TINT dos emissivos: o sprite de luz é neutro (cinza + alfa); a cada
// desenho ele é multiplicado pela cor do grupo (luzes.js) num canvas de
// apoio e somado à cena com 'lighter'. Trocar a cor no LUZ muda a luz no
// frame seguinte — sem tocar em nenhuma imagem.
// ============================================================
import { TILES, LUZES_SPRITES } from './tileset';
import { CAMADAS, TAM, TAM_LUZ, TS, PAREDE_H, PISO_H } from './mapa';
import { LUZ, corFinal, intensidadeAgora } from './luzes';

// Canvas de apoio do tint (um só, reaproveitado)
let tmp = null;
function tintar(ctx, img, r, dx, dy, dw, dh, cor, alfa) {
  if (alfa <= 0.01) return;
  if (!tmp) tmp = document.createElement('canvas');
  if (tmp.width < r.w) tmp.width = r.w;
  if (tmp.height < r.h) tmp.height = r.h;
  const t = tmp.getContext('2d');
  t.globalCompositeOperation = 'source-over';
  t.clearRect(0, 0, r.w, r.h);
  t.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  t.globalCompositeOperation = 'multiply';
  t.fillStyle = cor;
  t.fillRect(0, 0, r.w, r.h);
  t.globalCompositeOperation = 'destination-in';
  t.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  ctx.save();
  ctx.globalAlpha = Math.min(1, alfa);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(tmp, 0, 0, r.w, r.h, dx, dy, dw, dh);
  ctx.restore();
}

export function criarCenario({ tileset, emissivo }) {
  // desenha um tile base em (x, y) do mundo
  const tile = (ctx, nome, x, y) => {
    const r = TILES[nome], s = TAM[nome];
    ctx.drawImage(tileset, r.x, r.y, r.w, r.h, x, y, s.w, s.h);
  };
  // desenha um tile repetido horizontalmente cobrindo [de, ate]
  const tileRepetido = (ctx, nome, de, ate, y) => {
    const s = TAM[nome];
    const x0 = Math.floor(de / s.w) * s.w;
    for (let x = x0; x < ate; x += s.w) tile(ctx, nome, x, y);
  };

  const camadaBase = (ctx, itens, de, ate) => {
    for (const it of itens) {
      if (it.repetirX) { tileRepetido(ctx, it.tile, de, ate, it.y); continue; }
      const s = TAM[it.tile];
      const y = it.y !== undefined ? it.y : (it.baseZ ?? 0) - s.h;
      if (it.x + s.w < de || it.x > ate) continue;
      tile(ctx, it.tile, it.x, y);
    }
  };

  // desenha UMA luz emissiva tintada pela cor atual do grupo
  const luzItem = (ctx, it, de, ate, t, corCeu, fase) => {
    const g = LUZ.grupos[it.grupo];
    if (!g) return;
    const r = LUZES_SPRITES[it.luz], s = TAM_LUZ[it.luz];
    const alfa = intensidadeAgora(g, t, fase);
    if (alfa <= 0.01) return;
    const cor = g.seguirCeu && corCeu ? corCeu : corFinal(g);
    if (it.repetirX) {
      const x0 = Math.floor(de / s.w) * s.w;
      for (let x = x0; x < ate; x += s.w)
        tintar(ctx, emissivo, r, x, it.y, s.w, s.h, cor, alfa);
    } else if (!(it.x + s.w < de || it.x > ate)) {
      tintar(ctx, emissivo, r, it.x, it.y, s.w, s.h, cor, alfa);
    }
  };

  // Objetos com profundidade: cada um vira { z, desenhar } para o render
  // ordenar junto com o personagem (menor z = mais ao fundo = desenha antes).
  const objetos = CAMADAS.objetos.map((it) => ({
    z: it.baseZ,
    desenhar: (ctx) => {
      const s = TAM[it.tile];
      tile(ctx, it.tile, it.x, it.baseZ - s.h);
    },
  }));
  // Luzes presas a objetos (com baseZ) também entram no depth sorting — assim
  // o personagem NA FRENTE da plataforma não é cortado pelas barras/cubo.
  let faseObj = 0;
  for (const it of CAMADAS.luzes) {
    if (it.baseZ === undefined) continue;
    const fase = (faseObj += 1.7);
    objetos.push({
      z: it.baseZ,
      desenhar: (ctx, t, corCeu) => luzItem(ctx, it, -1e9, 1e9, t, corCeu, fase),
    });
  }

  return {
    // Parede, colunas, vigas, janelas e lâmpadas + teto/fundo escuros
    desenharFundo(ctx, de, ate) {
      ctx.fillStyle = '#05070d';                       // teto (aparece voando alto)
      ctx.fillRect(de, -PAREDE_H - 700, ate - de, 700);
      camadaBase(ctx, CAMADAS.fundo, de, ate);
      ctx.fillStyle = '#04060a';                       // abaixo do piso
      ctx.fillRect(de, PISO_H - 1, ate - de, 700);
    },
    desenharChao(ctx, de, ate) {
      camadaBase(ctx, CAMADAS.chao, de, ate);
    },
    // lista viva para o depth sort (o render soma o personagem e ordena)
    itensProfundidade: () => objetos.slice(),
    desenharFrente(ctx, de, ate) {
      camadaBase(ctx, CAMADAS.frente, de, ate);
    },
    // Emissivos tintados na hora, filtrados por `plano` ('fundo' | 'chao').
    // As luzes com baseZ NÃO passam por aqui: entram em itensProfundidade.
    // `corCeu` (opcional) pinta os grupos com `seguirCeu` (janelas
    // acompanham a fase do dia do relógio do jogo).
    desenharLuzes(ctx, de, ate, t, corCeu, plano) {
      let fase = 100;   // fases distintas das luzes com baseZ
      for (const it of CAMADAS.luzes) {
        if (it.baseZ !== undefined) continue;
        const f = (fase += 1.7);
        if ((it.plano || 'fundo') !== plano) continue;
        luzItem(ctx, it, de, ate, t, corCeu, f);
      }
    },
    // Véu de luz ambiente (em coordenadas de TELA, depois do restore)
    desenharAmbiente(ctx, VW, ALT, lum) {
      const a = LUZ.ambiente;
      const fator = a.seguirRelogio ? 1 - lum * 0.6 : 1;
      const op = Math.max(0, Math.min(1, a.opacidade * fator));
      if (op <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = op;
      ctx.fillStyle = a.cor;
      ctx.fillRect(0, 0, VW, ALT);
      ctx.restore();
    },
  };
}
