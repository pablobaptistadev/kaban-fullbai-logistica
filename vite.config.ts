import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
// GitHub Pages serve em /<repo>/ → base relativo ("./").
// Cloudflare Workers serve na raiz → `vite build --base=/` (script build:cf).
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    // Preview do CodeSandbox usa host dinâmico tipo *-5173.csb.app
    allowedHosts: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
  