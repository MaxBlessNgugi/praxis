import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';

export default defineConfig(({mode}) => {
  // `share` mode inlines JS, CSS and fonts into ONE self-contained HTML file
  // (npm run build:share) so the mockup can be handed to someone as a single file.
  const singleFile = mode === 'share';

  const apiBase = process.env.VITE_API_URL ?? 'http://localhost:4000';

  return {
    base: singleFile ? './' : '/',
    plugins: [react(), tailwindcss(), ...(singleFile ? [viteSingleFile()] : [])],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: singleFile
      ? {
          outDir: 'dist-share',
          emptyOutDir: true,
          cssCodeSplit: false,
          assetsInlineLimit: Number.MAX_SAFE_INTEGER,
          rollupOptions: {output: {inlineDynamicImports: true}},
        }
      : {},
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
