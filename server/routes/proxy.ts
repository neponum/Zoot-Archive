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
  'https://web.hycdn.cn/'
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
  // Unwrap nested weserv URLs if present
  let unwrappedTarget = targetUrl;
  while (unwrappedTarget.includes('images.weserv.nl/?url=')) {
    const match = unwrappedTarget.match(/images\.weserv\.nl\/\?url=([^&]+)/);
    if (match) {
      try {
        unwrappedTarget = decodeURIComponent(match[1]);
      } catch {
        break;
      }
    } else {
      break;
    }
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(unwrappedTarget);
  } catch {
    return res.status(400).json({ error: "Invalid target URL" });
  }

  // Security: Optional Referer check (browsers do not send Origin header on <audio>/<img> media GET requests)
  const referer = (req.headers.referer || '').toLowerCase();
  const origin = (req.headers.origin || '').toLowerCase();
  const host = (req.headers.host || '').toLowerCase();
  
  // Normalize target pathname
  const normalizedPathname = path.posix.normalize(parsedUrl.pathname);

  // Anti-traversal check
  if (normalizedPathname.includes('..') || parsedUrl.pathname.includes('..') || unwrappedTarget.includes('..')) {
    return res.status(403).json({ error: "Forbidden: Path traversal detected" });
  }

  // SSRF Protection: Restrict parsed hostname and prefix path
  const isAllowedDomain = 
    parsedUrl.hostname.endsWith('.hycdn.cn') ||
    parsedUrl.hostname.endsWith('.hypergryph.com') ||
    parsedUrl.hostname.endsWith('.prts.wiki') ||
    parsedUrl.hostname.endsWith('.githubusercontent.com') ||
    parsedUrl.hostname.endsWith('.jsdelivr.net') ||
    parsedUrl.hostname.endsWith('.weserv.nl') ||
    parsedUrl.hostname === 'hycdn.cn' ||
    parsedUrl.hostname === 'hypergryph.com' ||
    parsedUrl.hostname === 'prts.wiki' ||
    parsedUrl.hostname === 'raw.githubusercontent.com' ||
    parsedUrl.hostname === 'fastly.jsdelivr.net' ||
    parsedUrl.hostname === 'cdn.jsdelivr.net' ||
    parsedUrl.hostname === 'images.weserv.nl' ||
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
  async function fetchWithRetry(url: string, fetchOptions: any, retries = 2, timeoutMs = 8000, delay = 300): Promise<Response> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      let timeoutId: NodeJS.Timeout | null = null;
      try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => {
          controller.abort();
        }, timeoutMs);

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal
        });

        if (timeoutId) clearTimeout(timeoutId);

        // If ok, 206 Partial Content, or 404 (file doesn't exist, no need to retry), return the response
        if (response.ok || response.status === 404 || response.status === 206) {
          return response;
        }

        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      } catch (err: any) {
        if (timeoutId) clearTimeout(timeoutId);
        lastError = err;
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

    const isImage = safeUrl.endsWith('.png') || safeUrl.endsWith('.jpg') || safeUrl.endsWith('.jpeg') || safeUrl.endsWith('.webp') || safeUrl.includes('/background/') || safeUrl.includes('/images/') || safeUrl.includes('/characters/');
    const isGithubRaw = safeUrl.includes('raw.githubusercontent.com');
    const isTorappu = safeUrl.includes('torappu.prts.wiki');

    const convertToJsDelivr = (rawUrl: string): string | null => {
      const match = rawUrl.match(/^https:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)$/);
      if (match) {
        const [, user, repo, branch, pathStr] = match;
        return `https://fastly.jsdelivr.net/gh/${user}/${repo}@${branch}/${pathStr}`;
      }
      return null;
    };

    let response: Response;
    try {
      if (isGithubRaw) {
        const fastUrl = convertToJsDelivr(safeUrl);
        if (fastUrl) {
          try {
            response = await fetchWithRetry(fastUrl, { method: req.method, headers }, 2, 8000, 200);
          } catch {
            response = await fetchWithRetry(safeUrl, { method: req.method, headers }, 2, 8000);
          }
        } else {
          response = await fetchWithRetry(safeUrl, { method: req.method, headers }, 2, 8000);
        }
      } else {
        response = await fetchWithRetry(safeUrl, { method: req.method, headers }, 3, 10000, 300);
        if (response.status === 404 && isTorappu && safeUrl !== safeUrl.toLowerCase()) {
          try {
            const lowerRes = await fetchWithRetry(safeUrl.toLowerCase(), { method: req.method, headers }, 2, 8000, 200);
            if (lowerRes.ok) {
              response = lowerRes;
            }
          } catch {
            // keep original response
          }
        }
      }
    } catch (fetchErr: any) {
      if (isTorappu && safeUrl !== safeUrl.toLowerCase()) {
        try {
          response = await fetchWithRetry(safeUrl.toLowerCase(), { method: req.method, headers }, 2, 8000, 200);
          if (response.ok) {
            // Handled
          } else {
            throw new Error("Lowercase attempt failed");
          }
        } catch {
          if (isImage || isTorappu) {
            const fallbackUrl = `https://images.weserv.nl/?url=${encodeURIComponent(safeUrl.toLowerCase())}`;
            try {
              response = await fetchWithRetry(fallbackUrl, {
                method: req.method,
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
              }, 1, 6000);
            } catch {
              return res.status(404).json({ error: "Asset not found" });
            }
          } else {
            return res.status(404).json({ error: "Resource not found" });
          }
        }
      } else if (isImage || isTorappu) {
        const fallbackUrl = `https://images.weserv.nl/?url=${encodeURIComponent(safeUrl)}`;
        try {
          response = await fetchWithRetry(fallbackUrl, {
            method: req.method,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
          }, 1, 6000);
        } catch {
          return res.status(404).json({ error: "Asset not found" });
        }
      } else {
        return res.status(404).json({ error: "Resource not found" });
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
    
    if (req.method !== 'HEAD' && response.body) {
      // @ts-ignore
      const { Readable } = await import('stream');
      const stream = Readable.fromWeb(response.body as any);

      stream.on('error', (err: any) => {
        if (!res.headersSent) {
          res.status(500).end();
        } else {
          res.destroy();
        }
      });

      req.on('close', () => {
        try {
          stream.destroy();
        } catch {
          // ignore stream destroy error on client disconnect
        }
      });

      stream.pipe(res);
    } else {
      res.end();
    }
  } catch (error: any) {
    console.error(`Proxy error for ${targetUrl}:`, error.message);
    res.status(500).json({ error: "Internal server error during proxying", message: error.message });
  }
});

export default router;
