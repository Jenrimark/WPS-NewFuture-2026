import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      // 开发环境跨域：严格通过 Vite proxy 解决
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true
      }
    }
  }
});

