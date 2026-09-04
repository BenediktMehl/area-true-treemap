import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

// GitHub Pages serves the demo under /<repo>/, local dev under /.
// Set BASE_PATH (e.g. "/area-true-treemap/") when building for Pages.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
    },
  },
  server: {
    port: 5174,
  },
});
