import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import fs from "fs";
import dns from "dns";
import { config } from "./server/config.js";
import authRoutes from "./server/routes/auth.js";
import proxyRoutes from "./server/routes/proxy.js";
import bugRoutes from "./server/routes/bug.js";
import translateRoutes from "./server/routes/translate.js";
import voteRoutes from "./server/routes/vote.js";

dns.setDefaultResultOrder("ipv4first");

process.on('uncaughtException', (err: any) => {
  // Suppress undici / stream termination disconnect errors
  if (err?.message?.includes('terminated') || err?.name === 'TypeError') {
    console.warn('Caught network stream termination:', err.message);
  } else {
    console.error('Uncaught Exception:', err);
  }
});

process.on('unhandledRejection', (reason: any) => {
  console.warn('Unhandled Promise Rejection:', reason?.message || reason);
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy to get correct client IP behind reverse proxy
  app.set('trust proxy', 1);

  // Custom Security Headers middleware
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Download-Options", "noopen");
    res.setHeader("X-DNS-Prefetch-Control", "off");
    next();
  });

  // Global rate limiter to prevent general abuse
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests from this IP, please try again after 15 minutes"
  });
  app.use(globalLimiter);

  app.use(cookieParser());
  app.use(express.json());

  // API Routes FIRST
  app.use("/api/auth/discord", authRoutes);
  app.use("/auth/discord", authRoutes); // For the callback route
  app.use("/api/proxy", proxyRoutes);
  app.use("/api/bug-report", bugRoutes);
  app.use("/api/translate", translateRoutes);
  app.use("/api/vote", voteRoutes);

  // Vite middleware for development (or static serving for production)
  const distPath = path.join(process.cwd(), 'dist');
  const hasBuiltApp = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV !== "production" || !hasBuiltApp) {
    console.log("No production build found or running in development mode. Starting Vite dev server middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Production build detected. Serving static assets from dist...");
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  return app;
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
