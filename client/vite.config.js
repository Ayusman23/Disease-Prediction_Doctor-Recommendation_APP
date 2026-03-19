import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      // Disease Prediction Flask ML backend (port 5002)
      '/dpdr': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/dpdr/, ''),
      },
    },
  },
})

