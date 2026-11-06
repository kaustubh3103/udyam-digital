import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// `npm run build` → dist/ for GitHub Pages (relative paths).
// `npm run build:single` → one self-contained HTML file (images stay in public/kyc).
export default defineConfig({
  base: "./",
  plugins: [react(), ...(process.env.SINGLE ? [viteSingleFile()] : [])],
  build: { chunkSizeWarningLimit: 2000 },
});
