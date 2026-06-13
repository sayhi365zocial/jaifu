import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "ใจฟู — ฟินได้ ไม่ต้องจ่าย",
        short_name: "ใจฟู",
        description:
          "แอปสั่งของแบบไม่ต้องจ่ายจริง — เปลี่ยนความอยากช้อปให้กลายเป็นเงินในกระปุก พร้อมเช็คใจตัวเองก่อนและหลัง",
        lang: "th",
        theme_color: "#3B7DD8",
        background_color: "#F1F6FC",
        display: "standalone",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // never let the SW swallow API calls or serve index.html for them
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    port: 5180,
    proxy: {
      // Target the local backend. macOS AirPlay Receiver squats on ports
      // near :5000/:7000 — backend runs on :5050 in local dev (override
      // with VITE_DEV_API_TARGET if needed).
      "/api": {
        target: process.env.VITE_DEV_API_TARGET || "http://127.0.0.1:5050",
        changeOrigin: true,
      },
    },
  },
});
