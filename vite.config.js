import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// A relative base makes the build portable: the same `dist/` works at a domain
// root, at https://<user>.github.io/<repo>/, or opened straight off disk. No
// rebuild is needed when the repository is renamed. Combined with the hash
// router in src/App.jsx, the document URL never leaves the base directory, so
// relative asset paths always resolve.
//
// Change this to '/<repository-name>/' only if you specifically need absolute
// asset URLs; the relative default covers GitHub Pages already.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Split the heavyweight vendors out of the app bundle so the first paint
    // does not wait on the charting and PowerPoint-export libraries.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](recharts|d3-|victory-)/.test(id)) return 'charts';
          if (/[\\/]node_modules[\\/](pptxgenjs|html2canvas|jszip)/.test(id)) return 'export';
          if (/[\\/]node_modules[\\/](react|react-dom|react-router)/.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: false,
    // Unit tests live in src/. tests/ holds Playwright specs, which must not
    // be collected by Vitest — the two runners define incompatible globals.
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
})
