import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 5173,
    open: false,
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 2400,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('rapier')) return 'rapier' // only needed in the physics pit
          if (
            id.includes('three') ||
            id.includes('postprocessing') ||
            id.includes('monogrid') ||
            id.includes('maath') ||
            id.includes('stats-gl')
          ) {
            return 'three'
          }
          if (id.includes('gsap')) return 'gsap'
          if (id.includes('lenis') || id.includes('zustand') || id.includes('lucide')) return 'app-vendor'
          return 'vendor'
        },
      },
    },
  },
})
