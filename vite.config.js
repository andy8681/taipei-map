import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 保留原本的 Tailwind

// https://vitejs.dev/config/
export default defineConfig({

  base: '/taipei-map/', 
  
  plugins: [
    react(),
    tailwindcss(), // 保留原本的 Tailwind 外掛
  ],
})