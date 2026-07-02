import { createClient } from '@supabase/supabase-js';

// Projeto Supabase compartilhado com o AlpsPrime-OS. A chave "anon" é pública
// por natureza (vai para o navegador de qualquer forma) e está protegida por
// RLS: a tabela do jogo fica trancada e só as funções armor_load/armor_save,
// que exigem o código único do jogador, conseguem ler/gravar. Por isso é
// seguro deixar um valor padrão aqui; as variáveis de ambiente (na Vercel)
// têm prioridade e permitem trocar o projeto sem mexer no código.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://jlsjurtsmmcjocekjpte.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsc2p1cnRzbW1jam9jZWtqcHRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzM4OTksImV4cCI6MjA5NzQ0OTg5OX0.fSGNBoN9b88Z9PVqDJc4IHyyuZc-ygsuLktpQ2H8M5E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
