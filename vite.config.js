import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));
const resolve = (rel) => fileURLToPath(new URL(rel, import.meta.url));

export default defineConfig({
  // single source of truth for the build version — package.json
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  base: './',
  resolve: {
    alias: {
      // Consume the built @slu/web-shell v1.0.2 package (vendored, unmodified).
      // The `file:` dependency links it under node_modules on a normal install;
      // this alias makes the dev server + build resolve it with no install step.
      '@slu/web-shell': resolve('./vendor/slu-web-shell/dist/index.js'),
    },
  },
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
    rollupOptions: {
      // Two entry points during the migration: the old hand-rolled frame
      // (index.html) stays the equivalence baseline until the shell gates are
      // signed off; the shell frame (index.shell.html) is the port.
      input: {
        main: resolve('./index.html'),
        shell: resolve('./index.shell.html'),
      },
    },
  },
});
