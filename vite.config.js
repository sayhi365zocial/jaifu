import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Mount the same Express API the production server uses directly on the
// vite dev server, so `npm run dev` runs the full stack in one process
// (needs DATABASE_URL set, e.g. via a .env loaded by your shell).
function jaifuApiPlugin() {
  return {
    name: "jaifu-api",
    async configureServer(server) {
      if (!process.env.DATABASE_URL) {
        server.config.logger.warn(
          "[jaifu-api] DATABASE_URL not set — /api/jaifu disabled in dev"
        );
        return;
      }
      const express = (await import("express")).default;
      const { default: jaifuApi } = await import("./server/jaifu-api.js");
      const { ensureSchema } = await import("./server/db.js");
      await ensureSchema().catch((e) =>
        server.config.logger.error("[jaifu-api] schema init: " + e.message)
      );
      const app = express();
      app.set("trust proxy", 1);
      app.use("/api/jaifu", jaifuApi);
      server.middlewares.use(app);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    jaifuApiPlugin(),
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
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    port: 5180,
  },
});
