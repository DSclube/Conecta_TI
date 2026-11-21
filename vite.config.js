import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// Duas páginas: o jornal (index.html) e o painel do administrador (admin.html)
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin.html', import.meta.url))
      }
    }
  }
})
