import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { config } from "./server/config.js";
import authRoutes from "./server/routes/auth.js";
import proxyRoutes from "./server/routes/proxy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust Vercel's proxy to get the correct client IP
app.set('trust proxy', 1);

// Global rate limiter to prevent general abuse
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use(globalLimiter);

app.use(cookieParser());
app.use(express.json());

// Routes
app.use("/api/auth/discord", authRoutes);
app.use("/auth/discord", authRoutes); // For the callback route
app.use("/api/proxy", proxyRoutes);

// Vite middleware for development
if (!config.isProduction) {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start server only if not in a serverless environment (like Vercel)
if (!config.isProduction || !config.isVercel) {
  app.listen(config.port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
}

export default app;
