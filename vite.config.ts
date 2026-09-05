import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  publicDir: "public",
  base: "/",
  server: {
    host: true,
    port: 5173,
    open: false,
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    emptyOutDir: true,
    target: "es2020",
    minify: "esbuild",
    cssCodeSplit: true,
    cssMinify: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 900,
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three")) return "three";
          // Keep gaussian-splats as its own async chunk (dynamic import in SplatViewer)
          if (id.includes("node_modules/@mkkellogg/gaussian-splats-3d")) {
            return "gaussian-splats";
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ["three", "three/examples/jsm/controls/OrbitControls.js"],
  },
});
