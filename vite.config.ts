import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true, // telefondan aynı Wi-Fi üzerinden test edebilmek için
  },
  build: {
    chunkSizeWarningLimit: 2000, // Phaser tek chunk'ta büyük, sorun değil
  },
});
