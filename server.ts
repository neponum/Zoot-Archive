import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DISCORD_CLIENT_ID = process.env.VITE_DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_GUILD_ID = process.env.VITE_DISCORD_GUILD_ID;

const app = express();
const PORT = 3000;

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

// Discord OAuth Routes
app.get("/api/auth/discord/url", (req, res) => {
  if (!DISCORD_CLIENT_ID) {
    return res.status(500).json({ error: "Discord Client ID not configured" });
  }

  // Force https and use x-forwarded headers if available (common for proxies)
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const redirectUri = `${protocol}://${host}/auth/discord/callback`;

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds",
  });

  res.json({ url: `https://discord.com/api/oauth2/authorize?${params}` });
});

app.get("/auth/discord/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send("Missing code");
  }

  try {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const redirectUri = `${protocol}://${host}/auth/discord/callback`;

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID!,
        client_secret: DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: redirectUri,
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const tokens = await tokenResponse.json();
    if (!tokens.access_token) {
      throw new Error("Failed to get access token");
    }

    // Set cookie with access token
    res.cookie("discord_token", tokens.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'DISCORD_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("Discord OAuth error:", error.message);
    res.status(500).send("Authentication failed");
  }
});

app.get("/api/auth/discord/user", async (req, res) => {
  const token = req.cookies.discord_token;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    // Fetch user info
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userData = await userResponse.json();

    // Fetch user guilds
    const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const guilds = await guildsResponse.json();

    const isMember = DISCORD_GUILD_ID 
      ? guilds.some((g: any) => g.id === DISCORD_GUILD_ID)
      : true;

    res.json({
      user: {
        id: userData.id,
        username: userData.username,
        avatar: userData.avatar 
          ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
          : null,
      },
      isMember,
    });
  } catch (error: any) {
    console.error("Failed to fetch Discord user info:", error.message);
    res.status(500).json({ error: "Failed to fetch user info" });
  }
});

app.post("/api/auth/discord/logout", (req, res) => {
  res.clearCookie("discord_token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.json({ success: true });
});

// Stricter rate limiter for proxy
const proxyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 proxy requests per windowMs
  message: { error: "Too many proxy requests from this IP" }
});

// Proxy endpoint to fetch game data from GitHub/CDNs
app.get("/api/proxy", proxyLimiter, async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  // Security: Check Referer/Origin to ensure request comes from our frontend
  const referer = req.headers.referer || '';
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  
  // In production, enforce that the request originates from our own domain
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
    if (!referer.includes(host) && !origin.includes(host)) {
      return res.status(403).json({ error: "Forbidden: Invalid origin" });
    }
  }

  // Security: Restrict allowed domains to prevent open proxy abuse
  try {
    const urlObj = new URL(targetUrl);
    const allowedDomains = [
      'raw.githubusercontent.com', 
      'prts.wiki', 
      'torappu.prts.wiki', 
      'github.com'
    ];
    
    if (!allowedDomains.some(domain => urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain))) {
      return res.status(403).json({ error: "Forbidden: Target domain not allowed" });
    }
  } catch (e) {
    return res.status(400).json({ error: "Invalid target URL" });
  }

  try {
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    };

    // Add Referer for PRTS Wiki
    if (targetUrl.includes("prts.wiki")) {
      headers["Referer"] = "https://prts.wiki/";
    }

    const response = await fetch(targetUrl, { headers });
    
    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }
    
    // Add aggressive caching for game assets only on successful responses
    if (response.ok) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }

    res.status(response.status);
    
    if (response.body) {
      // @ts-ignore - Node.js 18+ native fetch body to stream
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

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
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
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
