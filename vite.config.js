import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// On GitHub Pages the site is served from /<repo>/, so we need a relative
// base. Using './' makes the built bundle work both at the project root and
// inside a subpath without re-configuring per environment.
export default defineConfig({
  plugins: [react()],
  base: './',
});
