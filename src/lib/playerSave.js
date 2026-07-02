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
    prefs: { zoomPerto: false, relogioAtivo: false },
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
