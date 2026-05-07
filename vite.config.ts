import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
// base relativo para GitHub Pages (funciona em /<repo>/)
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
  