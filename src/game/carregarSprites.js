// ============================================================
// PROJETO ARMOR · CARREGAMENTO + AUTOCALIBRAÇÃO DAS SPRITES
// Baixa as folhas de sprite e MEDE cada quadro (onde estão o corpo e os pés)
// para o motor plantar o personagem no chão sem tremor. Devolve as imagens já
// carregadas + as "leituras" (calibração) de cada uma.
//
// Chamado uma vez, na abertura (fase 'carregando' → 'pronto'/'erro').
// ============================================================
import {
  SPRITE_ANDAR, SPRITE_CORRER, SPRITE_PULAR, SPRITE_PARADO_ANIM,
  FRAMES_ANDAR, FRAMES_CORRER, FRAMES_PARADO_ANIM, CORRER_ALTURA_REL,
  PULAR_COLS, PULAR_ROWS, PULAR_FRAMES,
  PARADO_COLS, PARADO_ROWS,
} from './sprites';
import { URL_TILESET, URL_EMISSIVO } from './cenario/tileset';

// Baixa uma imagem (opcionalmente com CORS, para poder ler os pixels).
const carregar = (src, cors) =>
  new Promise((res, rej) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    img.onload = () => res(img); img.onerror = rej; img.src = src;
  });

// Mede, quadro a quadro de uma tira horizontal, a base (pés) e o centro do
// corpo — para o motor ancorar o personagem no chão sem tremor. `excluir`
// (opcional) ignora pixels de efeito (jato/poeira), como na calibrarGrade.
// Também devolve `areaR`: a área de pixels do corpo (mediana dos quadros,
// normalizada pela altura² da folha) — medida que quase não muda com a pose,
// usada para IGUALAR o tamanho entre folhas que não têm pose em pé (correr).
const calibrar = (img, nFrames, excluir) => {
  try {
    const CW = 200 * nFrames, CH = Math.max(1, Math.round(img.height * (CW / img.width)));
    const c = document.createElement('canvas'); c.width = CW; c.height = CH;
    const cx = c.getContext('2d'); cx.drawImage(img, 0, 0, CW, CH);
    const fw = CW / nFrames; const frames = []; let maiorCorpo = 0; const areas = [];
    for (let f = 0; f < nFrames; f++) {
      const x0 = Math.round(f * fw), W = Math.round(fw);
      const data = cx.getImageData(x0, 0, W, CH).data;
      let top = CH, bot = -1, esq = W, dir = -1, area = 0;
      for (let y = 0; y < CH; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (data[i + 3] <= 12) continue;
        if (excluir && excluir(data[i], data[i + 1], data[i + 2])) continue;
        area++;
        if (y < top) top = y; if (y > bot) bot = y;
        if (x < esq) esq = x; if (x > dir) dir = x;
      }
      if (bot < 0) { frames.push(null); continue; }
      const corpo = bot - top + 1; if (corpo > maiorCorpo) maiorCorpo = corpo;
      areas.push(area);
      frames.push({ botR: bot / CH, cxR: (esq + dir) / 2 / W });
    }
    const valido = frames.find(f => f !== null);
    if (!valido || maiorCorpo === 0) return null;
    for (let f = 0; f < nFrames; f++) if (!frames[f]) frames[f] = valido;
    areas.sort((a, b) => a - b);
    const areaR = areas[Math.floor(areas.length / 2)] / (CH * CH);
    return { frames, corpoR: maiorCorpo / CH, areaR };
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

// Carrega uma sprite tentando CORS (para calibrar); se falhar, cai para sem
// CORS (só exibe, sem leitura de pixels).
const carregarSprite = async (src, medir) => {
  try { const img = await carregar(src, true); return { img, leitura: medir(img) }; }
  catch (e) { const img = await carregar(src, false); return { img, leitura: null }; }
};

// Baixa as folhas ESSENCIAIS (andar + os dois atlas do cenário, todos locais
// e leves) e devolve — é o que o menu inicial espera. As folhas pesadas
// (parado 3MB, pular 2,7MB) e a de correr (host externo, pode ser lento)
// carregam em SEGUNDO PLANO e são entregues via `aoChegarExtra(patch)`
// conforme ficam prontas: o menu e o jogo abrem rápido, e correr/pular/parado
// "ligam" segundos depois (o motor já cai no sprite de andar enquanto cada
// uma não chega). Lança (rejeita) somente se as essenciais não carregarem.
export async function carregarSprites(aoChegarExtra) {
  const [a, cenarioImg, emissivoImg] = await Promise.all([
    carregarSprite(SPRITE_ANDAR, (im) => calibrar(im, FRAMES_ANDAR, ehChamaPropulsor)),
    carregar(URL_TILESET),
    carregar(URL_EMISSIVO),
  ]);

  const entregar = (patch) => { if (aoChegarExtra) aoChegarExtra(patch); };

  // CORRER: a folha não tem NENHUMA pose em pé (o corpo corre sempre
  // inclinado), então normalizar pela caixa do quadro mais alto — como nas
  // outras tiras — deixava o personagem MAIOR ao correr do que andando ou
  // pulando. Sincronizamos pelo corpo de verdade: a ÁREA de pixels do corpo
  // (quase constante entre poses) é igualada à da folha de andar — que por
  // sua vez já fica do mesmo tamanho do pulo/parado. O filtro de chama
  // (ehChamaPropulsor) tira jato/poeira da medição, senão o rastro entraria
  // na caixa e afundava/deslocava o personagem em relação ao chão.
  carregarSprite(SPRITE_CORRER, (im) => calibrar(im, FRAMES_CORRER, ehChamaPropulsor))
    .then((r) => {
      const w = a.leitura;
      if (r.leitura && w && w.areaR && r.leitura.areaR) {
        r.leitura.corpoR =
          (w.corpoR * Math.sqrt(r.leitura.areaR / w.areaR)) / CORRER_ALTURA_REL;
      }
      entregar({ correr: r.img, calibCorrer: r.leitura });
    })
    .catch(() => {});

  // PULO: cada quadro tem o corpo (agachado/voando/aterrissando) numa posição
  // diferente dentro da célula — a âncora (pés/centro) segue a leitura de
  // CADA quadro, como no andar/correr/parado, senão o personagem "pula" na
  // tela a cada troca de quadro (a célula fica fixa, mas o corpo desenhado
  // dentro dela se desloca). Só a ESCALA fica fixa (maior corpo da folha,
  // já devolvido em corpoR por calibrarGrade), pra não "respirar" de tamanho
  // entre agachar/voar/aterrissar.
  carregarSprite(SPRITE_PULAR, (im) => calibrarGrade(im, PULAR_COLS, PULAR_ROWS, PULAR_FRAMES, ehChamaPropulsor))
    .then((pl) => {
      entregar({ pular: pl.img, calibPular: pl.leitura });
    })
    .catch(() => {});

  // Folha em GRADE (como o pulo), não em tira horizontal — mede com
  // calibrarGrade. A folha NÃO tem o corpo pixel-a-pixel fixo na mesma
  // posição em toda célula (o personagem balança/respira), então a âncora
  // (pés/centro) precisa seguir a leitura de CADA quadro — como no andar/
  // correr — senão o personagem "anda sozinho" na idle: o recorte da
  // célula fica fixo na tela, mas o corpo desenhado dentro dela se desloca
  // quadro a quadro. Só a ESCALA fica fixa (maior corpo da folha), pra não
  // "respirar" de tamanho.
  carregarSprite(SPRITE_PARADO_ANIM, (im) => calibrarGrade(im, PARADO_COLS, PARADO_ROWS, FRAMES_PARADO_ANIM))
    .then((idle) => {
      entregar({ parado: idle.img, calibParado: idle.leitura });
    })
    .catch(() => {});

  // Só as essenciais; as demais chegam pelos patches acima (o ref do
  // componente já nasce com todas as chaves em null).
  return { andar: a.img, calibAndar: a.leitura, cenario: cenarioImg, emissivo: emissivoImg };
}
