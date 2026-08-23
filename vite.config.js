import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
  // single source of truth for the build version — package.json
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  base: './',
  server: { port: 5173, open: true },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
});
