import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import jaifuApi from "./server/jaifu-api.js";
import { ensureSchema } from "./server/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// Railway terminates TLS at one edge proxy — trust a single hop so req.ip
// is the real client (the per-IP rate limiter depends on it).
app.set("trust proxy", 1);

// API first, then the static SPA + catch-all.
app.use("/api/jaifu", jaifuApi);
app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

ensureSchema()
  .then(() => console.log("jaifu_stats schema ready"))
  .catch((e) => console.error("schema init failed (continuing):", e.message));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Jaifu running on http://0.0.0.0:${PORT}`);
});
