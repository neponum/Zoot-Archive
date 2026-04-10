import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

const router = Router();

const proxyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many proxy requests from this IP" }
});

const ALLOWED_PREFIXES = [
  'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/',
  'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/master/',
  'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/',
  'https://raw.githubusercontent.com/neponum/zoot-data/main/',
  'https://raw.githubusercontent.com/fexli/ArknightsResource/main/',
  'https://torappu.prts.wiki/',
  'https://prts.wiki/'
];

router.get('/', proxyLimiter, async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  // Security: Check Referer/Origin to ensure request comes from our frontend
  const referer = req.headers.referer || '';
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  
  if (config.isProduction && config.isVercel) {
    if (!referer.includes(host) && !origin.includes(host)) {
      return res.status(403).json({ error: "Forbidden: Invalid origin" });
    }
  }

  // SSRF Protection: Restrict allowed paths/repositories
  const isAllowed = ALLOWED_PREFIXES.some(prefix => targetUrl.startsWith(prefix));
  if (!isAllowed) {
    return res.status(403).json({ error: "Forbidden: Target URL path is not in the allowed list" });
  }

  try {
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    };

    if (targetUrl.includes("prts.wiki")) {
      headers["Referer"] = "https://prts.wiki/";
    }

    const response = await fetch(targetUrl, { headers });
    
    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }
    
    if (response.ok) {
      // Optimize for Vercel Edge Caching:
      // max-age: browser cache (1 year)
      // s-maxage: Vercel Edge cache (1 year)
      // stale-while-revalidate: serve stale content while revalidating in background
      res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=31536000, immutable");
    }

    res.status(response.status);
    
    if (response.body) {
      // @ts-ignore
      const { Readable } = await import('stream');
      Readable.fromWeb(response.body as any).pipe(res);
    } else {
      res.end();
    }
  } catch (error: any) {
    console.error(`Proxy error for ${targetUrl}:`, error.message);
    res.status(500).json({ error: "Internal server error during proxying", message: error.message });
  }
});

export default router;
