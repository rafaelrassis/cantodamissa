import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Só ativa em produção — em dev o service worker mais atrapalha
      // (cache velho escondendo mudanças) do que ajuda.
      devOptions: { enabled: false },
      includeAssets: ['favicon.svg', 'icon-192.png', 'icons.svg'],
      manifest: {
        name: 'Canto da Missa',
        short_name: 'Canto da Missa',
        description: 'Cifras, repertórios e ministério de música litúrgica',
        theme_color: '#15803d',
        background_color: '#15803d',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell (JS/CSS/HTML/ícones/fontes do build) — precache
        // clássico, funciona offline assim que visitado uma vez.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // Nunca cachear as chamadas de auth (login teria comportamento
        // estranho servido do cache) — todo o resto de /rest/v1 (dados) e
        // fontes fica coberto pelas regras abaixo.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Leitura de dados do Supabase (músicas, repertórios,
            // escalas etc.) — NetworkFirst: tenta rede, mas se estiver
            // offline serve a última resposta cacheada. Isso é o que faz
            // "abrir uma vez com sinal" valer offline depois.
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/v1/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-dados',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Nunca cachear auth (token, sessão) — sempre rede.
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/auth/v1/'),
            handler: 'NetworkOnly',
          },
          // As fontes agora saem do próprio build (ver src/index.css) e já
          // entram no precache pelo globPatterns acima — não há mais
          // requisição pro Google Fonts pra cachear em runtime.
        ],
      },
    }),
  ],
})
