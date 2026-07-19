import { defineConfig } from 'vite';

// DEPLOY_BASE lets CI build for a subpath host (GitHub Pages serves at
// /<repo>/). Local dev and tests stay at '/'.
export default defineConfig({
  base: process.env.DEPLOY_BASE || '/',
});
