import { supabase } from './supabase';

// Chave do código único do jogador no aparelho. Gerado no PRIMEIRO acesso e
// reutilizado sempre; é por ele que o Supabase identifica cada jogador, sem
// precisar de login.
const CODE_KEY = 'armor_player_code';

function novoCodigo() {
  const bruto =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return 'ARMOR-' + bruto.slice(0, 16).toUpperCase();
}

// Recupera o código do jogador; se ainda não existe (primeiro acesso), cria.
export function getPlayerCode() {
  let code = null;
  try {
    code = localStorage.getItem(CODE_KEY);
  } catch (e) {
    /* localStorage indisponível (modo privado etc.) */
  }
  if (!code) {
    code = novoCodigo();
    try {
      localStorage.setItem(CODE_KEY, code);
    } catch (e) {
      /* ignora: usa o código só na sessão atual */
    }
  }
  return code;
}

// Estrutura padrão do que é salvo. Extensível: basta adicionar campos aqui e
// gravá-los que eles passam a ser persistidos.
export function estadoInicial() {
  return {
    prefs: { zoomPerto: false, relogioAtivo: false },
    stats: { sessoes: 0, tempoJogadoSeg: 0, primeiraVez: null, ultimaVez: null },
    progresso: { nivel: 0, xp: 0 },
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
  };
}

// Carrega o estado do jogador atual do Supabase (ou padrão, se falhar/vazio).
export async function carregarEstado() {
  const code = getPlayerCode();
  try {
    const { data, error } = await supabase.rpc('armor_load', { p_code: code });
    if (error) throw error;
    return mesclarEstado(data);
  } catch (e) {
    console.warn('[armor] falha ao carregar estado:', e && e.message);
    return estadoInicial();
  }
}

// Salva (upsert) o estado do jogador atual no Supabase. Fire-and-forget.
export async function salvarEstado(state) {
  const code = getPlayerCode();
  try {
    const { error } = await supabase.rpc('armor_save', { p_code: code, p_state: state });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[armor] falha ao salvar estado:', e && e.message);
    return false;
  }
}
