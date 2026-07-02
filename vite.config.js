import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// base '/jogo/': o jogo é publicado sob o caminho /jogo do domínio da
// plataforma (alpsprime.com.br/jogo) via rewrite/proxy da Vercel. Com esse
// base, todos os assets são referenciados como /jogo/assets/... e resolvem
// corretamente através do proxy. Ficando na MESMA origem da plataforma, o jogo
// reaproveita a sessão de login já existente (sem novo login/cadastro).
export default defineConfig({
  base: '/jogo/',
  plugins: [react()],
})
