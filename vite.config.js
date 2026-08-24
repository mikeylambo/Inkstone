import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
  // single source of truth for the build version — package.json
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  base: './',
  // PORT lets a tool pick the port (and skip stealing focus with a browser
  // window); a bare `npm run dev` still lands on 5173 and opens as before.
  server: {
    port: Number(process.env.PORT) || 5173,
    open: !process.env.PORT,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
});
