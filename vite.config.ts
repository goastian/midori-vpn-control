import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig(({ command, mode }) => {
  const isDevServer = command === 'serve' && mode !== 'test'
  const env = isDevServer ? loadEnv(mode, process.cwd(), '') : {}
  const requireDevValue = (name: string): string => {
    const value = env[name]?.trim()
    if (!value) throw new Error(`${name} is required by the Control development server`)
    return value
  }

  let server
  if (isDevServer) {
    const portValue = requireDevValue('CONTROL_DEV_PORT')
    const port = Number(portValue)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`CONTROL_DEV_PORT must be an integer between 1 and 65535, got ${portValue}`)
    }
    const apiTarget = new URL(requireDevValue('CONTROL_DEV_API_URL'))
    const wsTarget = new URL(apiTarget)
    wsTarget.protocol = apiTarget.protocol === 'https:' ? 'wss:' : 'ws:'
    server = {
      port,
      proxy: {
        '/api': { target: apiTarget.origin, changeOrigin: true },
        '/health': { target: apiTarget.origin, changeOrigin: true },
        '/ws': { target: wsTarget.origin, ws: true },
      },
    }
  }

  return {
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: {
        '@': resolve(import.meta.dirname, 'src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (/node_modules\/(vue|vue-router|pinia)\//.test(id)) {
              return 'vendor'
            }
          }
        },
      },
    },
    server,
    test: {
      environment: 'happy-dom',
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary'],
        include: ['src/**/*.{ts,vue}'],
        exclude: ['src/__tests__/**', 'src/env.d.ts'],
        thresholds: {
          statements: 70,
          branches: 60,
          functions: 60,
          lines: 70,
        },
      },
    },
  }
})
