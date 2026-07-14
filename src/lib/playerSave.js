import { supabase } from './supabase';

// Persistência do progresso do jogador no Supabase, atrelada à MESMA conta com
// que o usuário entrou na plataforma AlpsPrime (Supabase Auth). Não há mais
// login/código próprio do jogo: quando o jogo é servido dentro do domínio da
// plataforma (ex.: alpsprime.com.br/jogo), ele compartilha a sessão já iniciada
// e identifica o jogador pelo `auth.uid()`. A tabela `armor_game_state`
// (user_id → state) já é protegida por RLS: cada usuário só lê/grava o seu.

// Cache do id do usuário logado, para não pedir a sessão a cada gravação.
let cachedUserId = null;
let sessionReady = null;

async function resolveUserId() {
  const { data } = await supabase.auth.getSession();
  cachedUserId = data?.session?.user?.id || null;
  return cachedUserId;
}

// Mantém o cache em dia se a sessão mudar (login/logout na mesma aba).
supabase.auth.onAuthStateChange((_event, session) => {
  cachedUserId = session?.user?.id || null;
});

async function currentUserId() {
  if (cachedUserId) return cachedUserId;
  if (!sessionReady) sessionReady = resolveUserId();
  return sessionReady;
}

// Indica se há um usuário logado (ex.: para a UI decidir se mostra progresso).
export async function estaLogado() {
  return Boolean(await currentUserId());
}

// Estrutura padrão do que é salvo. Extensível: basta adicionar campos aqui e
// gravá-los que eles passam a ser persistidos.
export function estadoInicial() {
  return {
    prefs: {
      zoomPerto: false,
      relogioAtivo: false,
      // Preferências editáveis no painel de Configurações (persistidas no mesmo
      // JSON `state` da tabela armor_game_state → salvas no Supabase).
      nomePiloto: '',        // nome exibido no perfil da tela inicial
      volume: 70,            // (legado) volume mestre — mantido por compat
      volumeMusica: 70,      // volume da música (0..100)
      volumeEfeitos: 85,     // volume dos efeitos (0..100) — feedback sonoro da UI
      sensibilidade: 50,     // sensibilidade da mira (0..100) — zona morta do joystick
      idioma: 'pt-BR',       // idioma da interface
      vibracao: true,        // vibração ao atirar/acertar
    },
    stats: { sessoes: 0, tempoJogadoSeg: 0, primeiraVez: null, ultimaVez: null },
    progresso: { nivel: 0, xp: 0 },
    // Posição do personagem no mundo (para reabrir exatamente onde parou).
    // null = nunca jogou → usa a posição inicial padrão do jogo.
    pos: null,
  };
}

// Mescla o que veio do banco com os padrões, para nunca faltar campo.
export function mesclarEstado(s) {
  const base = estadoInicial();
  if (!s || typeof s !== 'object') return base;
  return {
    prefs: { ...base.prefs, ...(s.prefs || {}) },
    stats: { ...base.stats, ...(s.stats || {}) },
    progresso: { ...base.progresso, ...(s.progresso || {}) },
    pos: s.pos && typeof s.pos === 'object' ? s.pos : base.pos,
  };
}

// Carrega o estado do jogador logado do Supabase (ou padrão, se não logado/vazio).
export async function carregarEstado() {
  const uid = await currentUserId();
  if (!uid) return estadoInicial();
  try {
    const { data, error } = await supabase
      .from('armor_game_state')
      .select('state')
      .eq('user_id', uid)
      .maybeSingle();
    if (error) throw error;
    return mesclarEstado(data?.state);
  } catch (e) {
    console.warn('[armor] falha ao carregar estado:', e && e.message);
    return estadoInicial();
  }
}

// E-mail da conta logada (Supabase Auth) — só leitura, para exibir no painel de
// Configurações. null quando não há sessão (jogo aberto fora da plataforma).
export async function emailDaConta() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.email || null;
}

// Busca a foto de perfil salva na tabela `usuarios`, coluna `profile_picture_url`
// — a MESMA que a tela de Perfil do AlpsPrime-OS lê/grava (mesma conta, mesmo
// projeto Supabase). null = sem sessão ou sem foto cadastrada (a UI então
// mostra a silhueta padrão).
export async function carregarFotoPerfil() {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;
  if (!session) return null;

  // Caminho rápido: o AlpsPrime-OS mantém `profile_picture_url` sincronizado
  // no `user_metadata` da própria sessão (ver AuthContext.jsx de lá) — lendo
  // daqui a foto aparece na hora, sem outra ida ao banco.
  const metaFoto = session.user?.user_metadata?.profile_picture_url;
  if (metaFoto) return metaFoto;

  // Fallback (raro: sessão ainda não sincronizada com a metadata) — busca
  // direto na tabela `usuarios`.
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('profile_picture_url')
      .eq('id', session.user.id)
      .maybeSingle();
    if (error) throw error;
    return data?.profile_picture_url || null;
  } catch (e) {
    console.warn('[armor] falha ao carregar foto de perfil:', e && e.message);
    return null;
  }
}

// Redimensiona/comprime a imagem no navegador antes de subir (evita mandar a
// foto de 12MB da câmera do celular direto pro Storage). Recorta em quadrado
// (centralizado) — a foto sempre aparece num círculo na UI, então cortar em
// quadrado aqui evita "esticar" a foto original.
const LADO_AVATAR = 400;

async function prepararAvatar(file) {
  const bitmap = await createImageBitmap(file);
  const lado = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - lado) / 2;
  const sy = (bitmap.height - lado) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = LADO_AVATAR;
  canvas.height = LADO_AVATAR;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, sx, sy, lado, lado, 0, 0, LADO_AVATAR, LADO_AVATAR);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.85)
  );
  if (!blob) throw new Error('falha ao comprimir imagem');
  return blob;
}

// Envia uma nova foto de perfil: comprime no navegador, sobe pro Storage
// (bucket "uploads", pasta avatars/<uid>/ — liberada por RLS só pro dono e
// só com acesso pago, ver migração armor_avatar_upload_rls) e grava a URL em
// `usuarios.profile_picture_url` (upsert — cobre o caso raro da linha ainda
// não existir). Retorna a URL nova, ou lança erro (a UI decide como avisar).
export async function enviarFotoPerfil(file) {
  const uid = await currentUserId();
  if (!uid) throw new Error('sem sessão');
  if (!file || !file.type || !file.type.startsWith('image/')) {
    throw new Error('escolha um arquivo de imagem');
  }

  const blob = await prepararAvatar(file);
  const caminho = `avatars/${uid}/avatar-${Date.now()}.webp`;

  const { error: erroUpload } = await supabase.storage
    .from('uploads')
    .upload(caminho, blob, { contentType: 'image/webp', upsert: true });
  if (erroUpload) throw erroUpload;

  const { data: pub } = supabase.storage.from('uploads').getPublicUrl(caminho);
  const url = pub?.publicUrl;
  if (!url) throw new Error('falha ao obter URL pública');

  const { error: erroSalvar } = await supabase
    .from('usuarios')
    .upsert(
      { id: uid, profile_picture_url: url, updated_date: new Date().toISOString() },
      { onConflict: 'id' }
    );
  if (erroSalvar) throw erroSalvar;

  return url;
}

// Salva (upsert) o estado do jogador logado no Supabase. Fire-and-forget.
// Sem sessão (jogo aberto fora da plataforma), simplesmente não grava.
export async function salvarEstado(state) {
  const uid = await currentUserId();
  if (!uid) return false;
  try {
    const { error } = await supabase
      .from('armor_game_state')
      .upsert(
        { user_id: uid, state, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[armor] falha ao salvar estado:', e && e.message);
    return false;
  }
}
