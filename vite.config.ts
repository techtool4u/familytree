import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build`        → normal PWA build in dist/ (deploy to any static host)
// `npm run build:single` → one self-contained HTML file in dist-single/ (open by double-click)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  build: mode === 'single' ? { outDir: 'dist-single', copyPublicDir: false } : {},
  define: mode === 'single' ? { 'import.meta.env.VITE_SINGLEFILE': '"1"' } : {},
}))
