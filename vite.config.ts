import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import * as Sentry from "@sentry/vite-plugin"
import envPlugin from 'vite-plugin-environment'

export default defineConfig(({ mode }) => {
  // Carregar variáveis de ambiente do .env
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      // Expondo SOMENTE as variáveis necessárias
      envPlugin([
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID',
        'VITE_FIREBASE_STORAGE_BUCKET',
        'VITE_FIREBASE_MESSAGING_SENDER_ID',
        'VITE_FIREBASE_APP_ID',
        'VITE_FIREBASE_MEASUREMENT_ID',
        'VITE_SENTRY_DSN',
        'VITE_APP_ENV',
        'SENTRY_AUTH_TOKEN'
      ]),
      Sentry.sentryVitePlugin({
        org: "vemsimbora",          // Verifique se esse é o nome correto da organização
        project: "vemsimbora", // Verifique se esse é o nome correto do projeto
        authToken: env.SENTRY_AUTH_TOKEN,
        release: {
          name: env.VITE_SENTRY_RELEASE || "default-release",
          inject: true
        }
      })
    ],
    server: {
      port: 3000,
      open: true,
      cors: true,
      historyApiFallback: true, // THIS IS THE KEY CHANGE FOR SPA ROUTING
    },
    preview: {
      port: 8080
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html']
      }
    },
    resolve: {
      alias: {
        '@': '/src'
      }
    }
  }
})
