// ============================================================
// PROJETO ARMOR · CARREGAMENTO + AUTOCALIBRAÇÃO DAS SPRITES
// Baixa as folhas de sprite e MEDE cada quadro (onde estão o corpo e os pés)
// para o motor plantar o personagem no chão sem tremor. Devolve as imagens já
// carregadas + as "leituras" (calibração) de cada uma.
//
// Chamado uma vez, na abertura (fase 'carregando' → 'pronto'/'erro').
// ============================================================
import {
  SPRITE_ANDAR, SPRITE_CORRER, SPRITE_PULAR, SPRITE_PARADO_ANIM, IMG_CHAO,
  FRAMES_ANDAR, FRAMES_CORRER, FRAMES_PARADO_ANIM,
  PULAR_COLS, PULAR_ROWS, PULAR_FRAMES,
} from './sprites';

// Baixa uma imagem (opcionalmente com CORS, para poder ler os pixels).
const carregar = (src, cors) =>
  new Promise((res, rej) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    img.onload = () => res(img); img.onerror = rej; img.src = src;
  });

// Mede, quadro a quadro de uma tira horizontal, a base (pés) e o centro do
// corpo — para o motor ancorar o personagem no chão sem tremor.
const calibrar = (img, nFrames) => {
  try {
    const CW = 200 * nFrames, CH = Math.max(1, Math.round(img.height * (CW / img.width)));
    const c = document.createElement('canvas'); c.width = CW; c.height = CH;
    const cx = c.getContext('2d'); cx.drawImage(img, 0, 0, CW, CH);
    const fw = CW / nFrames; const frames = []; let maiorCorpo = 0;
    for (let f = 0; f < nFrames; f++) {
      const x0 = Math.round(f * fw), W = Math.round(fw);
      const data = cx.getImageData(x0, 0, W, CH).data;
      let top = CH, bot = -1, esq = W, dir = -1;
      for (let y = 0; y < CH; y++) for (let x = 0; x < W; x++)
        if (data[(y * W + x) * 4 + 3] > 12) {
          if (y < top) top = y; if (y > bot) bot = y;
          if (x < esq) esq = x; if (x > dir) dir = x;
        }
      if (bot < 0) { frames.push(null); continue; }
      const corpo = bot - top + 1; if (corpo > maiorCorpo) maiorCorpo = corpo;
      frames.push({ botR: bot / CH, cxR: (esq + dir) / 2 / W });
    }
    const valido = frames.find(f => f !== null);
    if (!valido || maiorCorpo === 0) return null;
    for (let f = 0; f < nFrames; f++) if (!frames[f]) frames[f] = valido;
    return { frames, corpoR: maiorCorpo / CH };
  } catch (e) { return null; }
};

// Mede, quadro a quadro de uma folha em GRADE (colunas x linhas), a base
// (pés) e o centro do corpo — igual à `calibrar` acima, mas para grades em
// vez de tira horizontal. `excluir(r,g,b)` opcionalmente ignora pixels de
// efeito visual (ex.: chama do propulsor do pulo) que não são o corpo, pra
// não puxar a medição pra ponta do efeito e fazer o personagem "tremer".
const calibrarGrade = (img, cols, rows, nFrames, excluir) => {
  try {
    const CW = img.width, CH = img.height;
    const c = document.createElement('canvas'); c.width = CW; c.height = CH;
    const cx = c.getContext('2d'); cx.drawImage(img, 0, 0, CW, CH);
    const fw = CW / cols, fh = CH / rows;
    const frames = []; let maiorCorpo = 0;
    for (let f = 0; f < nFrames; f++) {
      const col = f % cols, row = Math.floor(f / cols);
      const x0 = Math.round(col * fw), y0 = Math.round(row * fh);
      const W = Math.round(fw), H = Math.round(fh);
      const data = cx.getImageData(x0, y0, W, H).data;
      let top = H, bot = -1, esq = W, dir = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (data[i + 3] <= 12) continue;
        if (excluir && excluir(data[i], data[i + 1], data[i + 2])) continue;
        if (y < top) top = y; if (y > bot) bot = y;
        if (x < esq) esq = x; if (x > dir) dir = x;
      }
      if (bot < 0) { frames.push(null); continue; }
      const corpo = bot - top + 1; if (corpo > maiorCorpo) maiorCorpo = corpo;
      frames.push({ botR: bot / H, cxR: (esq + dir) / 2 / W, altR: corpo / H });
    }
    const valido = frames.find(f => f !== null);
    if (!valido || maiorCorpo === 0) return null;
    for (let f = 0; f < nFrames; f++) if (!frames[f]) frames[f] = valido;
    return { frames, corpoR: maiorCorpo / fh };
  } catch (e) { return null; }
};

// Cor do rastro do propulsor do pulo (azul-ciano bem saturado) — pixels
// assim são ignorados na medição do corpo, senão o "pé" mediria a ponta da
// chama em vez da bota do personagem.
const ehChamaPropulsor = (r, g, b) => (b - r > 55 && b > 130 && g > 90);

// Mede a faixa de chão: onde começa/termina verticalmente e a cor do rodapé.
const calibrarChao = (img) => {
  try {
    const CW = 400, CH = Math.max(1, Math.round(img.height * (CW / img.width)));
    const c = document.createElement('canvas'); c.width = CW; c.height = CH;
    const cx = c.getContext('2d'); cx.drawImage(img, 0, 0, CW, CH);
    const data = cx.getImageData(0, 0, CW, CH).data;
    let topRow = -1, botRow = -1;
    for (let y = 0; y < CH && topRow < 0; y++) for (let x = 0; x < CW; x += 2)
      if (data[(y * CW + x) * 4 + 3] > 12) { topRow = y; break; }
    for (let y = CH - 1; y >= 0 && botRow < 0; y--) for (let x = 0; x < CW; x += 2)
      if (data[(y * CW + x) * 4 + 3] > 12) { botRow = y; break; }
    if (topRow < 0) return null;
    const sy = Math.max(0, botRow - 2), si = (sy * CW + Math.floor(CW / 2)) * 4;
    return { topR: topRow / CH, botR: (botRow + 1) / CH, cor: `rgb(${data[si]},${data[si + 1]},${data[si + 2]})` };
  } catch (e) { return null; }
};

// Carrega uma sprite tentando CORS (para calibrar); se falhar, cai para sem
// CORS (só exibe, sem leitura de pixels).
const carregarSprite = async (src, medir) => {
  try { const img = await carregar(src, true); return { img, leitura: medir(img) }; }
  catch (e) { const img = await carregar(src, false); return { img, leitura: null }; }
};

// Baixa as folhas ESSENCIAIS (andar + chão, ~700KB) e devolve — é o que o
// menu inicial espera. As folhas pesadas (parado 3MB, pular 2,7MB) e a de
// correr (host externo, pode ser lento) carregam em SEGUNDO PLANO e são
// entregues via `aoChegarExtra(patch)` conforme ficam prontas: o menu e o
// jogo abrem rápido, e correr/pular/parado "ligam" segundos depois (o motor
// já cai no sprite de andar enquanto cada uma não chega).
// Lança (rejeita) somente se as essenciais (andar/chão) não carregarem.
export async function carregarSprites(aoChegarExtra) {
  const [a, solo] = await Promise.all([
    carregarSprite(SPRITE_ANDAR, (im) => calibrar(im, FRAMES_ANDAR)),
    carregarSprite(IMG_CHAO, calibrarChao),
  ]);

  const entregar = (patch) => { if (aoChegarExtra) aoChegarExtra(patch); };

  carregarSprite(SPRITE_CORRER, (im) => calibrar(im, FRAMES_CORRER))
    .then((r) => entregar({ correr: r.img, calibCorrer: r.leitura }))
    .catch(() => {});

  // PULO: a folha tem 207 quadros gerados um a um (sem rig), então a caixa do
  // corpo muda de tamanho/posição a cada quadro — se a âncora seguisse essas
  // caixas, o personagem tremia e encolhia (a escala era normalizada pelo
  // MAIOR corpo da folha, uma pose esticada de voo). Usamos a leitura do
  // quadro 0 (em pé) para TODOS: escala constante — em pé fica do MESMO
  // tamanho do andar/correr — e âncora fixa, sem tremor.
  carregarSprite(SPRITE_PULAR, (im) => calibrarGrade(im, PULAR_COLS, PULAR_ROWS, PULAR_FRAMES, ehChamaPropulsor))
    .then((pl) => {
      if (pl.leitura && pl.leitura.frames.length) {
        const base = pl.leitura.frames[0];
        pl.leitura = {
          corpoR: base.altR || pl.leitura.corpoR,
          frames: pl.leitura.frames.map(() => base),
        };
      }
      entregar({ pular: pl.img, calibPular: pl.leitura });
    })
    .catch(() => {});

  // A folha do idle já vem com os pés ancorados no mesmo ponto de cada célula.
  // Usamos a leitura do frame 0 para TODOS os frames: offset de desenho
  // constante → pés fixos no chão (a autocalibração por frame compensaria o
  // balanço do corpo e faria os pés tremerem).
  carregarSprite(SPRITE_PARADO_ANIM, (im) => calibrar(im, FRAMES_PARADO_ANIM))
    .then((idle) => {
      if (idle.leitura && idle.leitura.frames.length) {
        const base = idle.leitura.frames[0];
        idle.leitura = { ...idle.leitura, frames: idle.leitura.frames.map(() => base) };
      }
      entregar({ parado: idle.img, calibParado: idle.leitura });
    })
    .catch(() => {});

  // Só as essenciais; as demais chegam pelos patches acima (o ref do
  // componente já nasce com todas as chaves em null).
  return { andar: a.img, calibAndar: a.leitura, chao: solo.img, chaoCalib: solo.leitura };
}
