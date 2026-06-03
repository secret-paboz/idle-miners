import { defineConfig } from "vite";

export default defineConfig({
  // Project root is where index.html lives — already the case
  root: ".",

  build: {
    outDir: "dist",
    emptyOutDir: true,
  },

  server: {
    // Proxy API calls to Vercel dev server during local development
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
