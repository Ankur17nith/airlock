import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2023',
    sourcemap: true,
    // The checker chunk is mostly the Firebase SDK (AI Logic, Auth, Firestore, App Check, Remote Config).
    // It is lazy-loaded on #/app only; the landing page bundle stays under 400 kB.
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
