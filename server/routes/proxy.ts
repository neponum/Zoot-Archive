import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from '../config.js';

const router = Router();

const proxyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: { error: "Too many proxy requests from this IP" }
});

const ALLOWED_PREFIXES = [
  'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/',
  'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/master/',
  'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/',
  'https://raw.githubusercontent.com/neponum/zoot-data/main/',
  'https://raw.githubusercontent.com/fexli/ArknightsResource/main/',
  'https://torappu.prts.wiki/',
  'https://prts.wiki/',
  'https://monster-siren.hypergryph.com/',
  'https://web.hycdn.cn/',
  'https://res01.banyat.com/'
];

// Pre-parse allowed prefixes for strict hostname and normalized path matching
const PARSED_ALLOWED_PREFIXES = ALLOWED_PREFIXES.map(p => {
  const u = new URL(p);
  return {
    hostname: u.hostname,
    pathname: path.posix.normalize(u.pathname)
  };
});

router.get('/', proxyLimiter, async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  // Parse and validate the target url
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (e) {
    return res.status(400).json({ error: "Invalid target URL" });
  }

  // Security: Optional Referer check (browsers do not send Origin header on <audio>/<img> media GET requests)
  const referer = (req.headers.referer || '').toLowerCase();
  const origin = (req.headers.origin || '').toLowerCase();
  const host = (req.headers.host || '').toLowerCase();
  
  // Normalize target pathname
  const normalizedPathname = path.posix.normalize(parsedUrl.pathname);

  // Anti-traversal check
  if (normalizedPathname.includes('..') || parsedUrl.pathname.includes('..') || targetUrl.includes('..')) {
    return res.status(403).json({ error: "Forbidden: Path traversal detected" });
  }

  // SSRF Protection: Restrict parsed hostname and prefix path
  const isAllowedDomain = 
    parsedUrl.hostname.endsWith('.hycdn.cn') ||
    parsedUrl.hostname.endsWith('.hypergryph.com') ||
    parsedUrl.hostname.endsWith('.banyat.com') ||
    parsedUrl.hostname.endsWith('.prts.wiki') ||
    parsedUrl.hostname.endsWith('.githubusercontent.com') ||
    parsedUrl.hostname === 'hycdn.cn' ||
    parsedUrl.hostname === 'hypergryph.com' ||
    parsedUrl.hostname === 'banyat.com' ||
    parsedUrl.hostname === 'prts.wiki' ||
    parsedUrl.hostname === 'raw.githubusercontent.com' ||
    PARSED_ALLOWED_PREFIXES.some(prefix => {
      if (parsedUrl.hostname !== prefix.hostname) return false;
      return normalizedPathname.startsWith(prefix.pathname);
    });

  if (!isAllowedDomain) {
    return res.status(403).json({ error: "Forbidden: Target URL path is not in the allowed list" });
  }

  // Construct safe request URL
  const safeUrl = parsedUrl.toString();

  // Helper for robust fetching with retries and timeout
  async function fetchWithRetry(url: string, fetchOptions: any, retries = 3, delay = 500): Promise<Response> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      let timeoutId: NodeJS.Timeout | null = null;
      try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => {
          controller.abort();
        }, 8000); // 8 seconds timeout per attempt

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal
        });

        if (timeoutId) clearTimeout(timeoutId);

        // If ok or 404 (file doesn't exist, no need to retry), return the response
        if (response.ok || response.status === 404) {
          return response;
        }

        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      } catch (err: any) {
        if (timeoutId) clearTimeout(timeoutId);
        lastError = err;
        console.warn(`[Proxy Attempt ${i + 1}/${retries}] failed for ${url}: ${err.message || err}`);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }
    }
    throw lastError;
  }

  try {
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    };

    if (req.headers.range) {
      headers["Range"] = req.headers.range as string;
    }

    if (safeUrl.includes("prts.wiki")) {
      headers["Referer"] = "https://prts.wiki/";
    }

    const isImage = safeUrl.endsWith('.png') || safeUrl.endsWith('.jpg') || safeUrl.endsWith('.jpeg') || safeUrl.endsWith('.webp') || safeUrl.includes('/background/') || safeUrl.includes('/images/');

    let response: Response;
    try {
      response = await fetchWithRetry(safeUrl, { method: req.method, headers });
    } catch (fetchErr: any) {
      if (isImage) {
        console.warn(`Direct proxy fetch failed for image ${safeUrl}. Trying fallback via images.weserv.nl proxy...`);
        // Weserv is a free, robust open source image proxy powered by Cloudflare
        const fallbackUrl = `https://images.weserv.nl/?url=${encodeURIComponent(safeUrl)}`;
        try {
          response = await fetchWithRetry(fallbackUrl, {
            method: req.method,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
          }, 2, 500);
          console.log(`Successfully fetched image via weserv fallback for ${safeUrl}`);
        } catch (weservErr: any) {
          console.error(`Fallback weserv proxy also failed for ${safeUrl}:`, weservErr.message);
          throw fetchErr; // Throw original error if fallback also fails
        }
      } else {
        throw fetchErr;
      }
    }
    
    // Forward crucial headers for audio/media streaming
    const forwardHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
    forwardHeaders.forEach(h => {
      const val = response.headers.get(h);
      if (val) {
        res.setHeader(h, val);
      }
    });

    const filename = req.query.filename as string;
    if (filename) {
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    }
    
    if (response.ok) {
      // Optimize for Vercel Edge Caching:
      if (safeUrl.endsWith('.json') || safeUrl.includes('/assets/avg/character.json')) {
        // For frequently updated or configuration JSON files, cache for a shorter period on browser (1 hr),
        // moderate on CDN (1 day), and allow generous stale-while-revalidate (1 week) for background updates.
        res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
      } else {
        // Immutable static assets (images, audio, etc.) can be heavily cached
        res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=31536000, immutable");
      }
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
