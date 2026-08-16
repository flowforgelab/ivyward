import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    // The phaser vendor chunk is intentionally ~1.5 MB (engine code, cached
    // across deploys); only warn if something grows past it.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Phaser dominates the bundle and changes only on dependency
          // bumps; a separate chunk lets returning players cache it across
          // deploys (#195).
          phaser: ["phaser"],
        },
      },
    },
  },
});
