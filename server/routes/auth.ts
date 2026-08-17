import { Router, Request, Response } from 'express';
import { config } from '../config.js';
import crypto from 'crypto';
import { extractDiscordToken, setDiscordAuthCookie, clearDiscordAuthCookie, isSecureRequest } from '../utils/authHelper.js';

const router = Router();

router.get('/url', (req: Request, res: Response) => {
  if (!config.discord.clientId) {
    return res.status(500).json({ error: "Discord Client ID not configured" });
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const redirectUri = `${protocol}://${host}/auth/discord/callback`;

  const state = crypto.randomBytes(16).toString('hex');
  const secure = isSecureRequest(req);

  res.cookie("oauth_state", state, {
    httpOnly: true,
    secure: secure,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  const params = new URLSearchParams({
    client_id: config.discord.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds",
    state: state,
  });

  res.setHeader("Cache-Control", "no-store");
  res.json({ url: `https://discord.com/api/oauth2/authorize?${params}` });
});

router.get('/redirect', (req: Request, res: Response) => {
  if (!config.discord.clientId) {
    return res.status(500).send("Discord Client ID not configured");
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const redirectUri = `${protocol}://${host}/auth/discord/callback`;

  const state = crypto.randomBytes(16).toString('hex');
  const secure = isSecureRequest(req);

  res.cookie("oauth_state", state, {
    httpOnly: true,
    secure: secure,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  const params = new URLSearchParams({
    client_id: config.discord.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds",
    state: state,
  });

  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

router.get('/user', async (req: Request, res: Response) => {
  const token = extractDiscordToken(req);
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!userResponse.ok) {
      if (userResponse.status === 401) {
        clearDiscordAuthCookie(res, req);
        return res.status(401).json({ error: "Session expired or invalid token" });
      }
      throw new Error(`Discord API responded with status ${userResponse.status}`);
    }

    const userData = (await userResponse.json()) as any;

    let isMember = true;
    if (config.discord.guildId) {
      const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (guildsResponse.ok) {
        const guilds = (await guildsResponse.json()) as Array<{ id: string }>;
        isMember = Array.isArray(guilds) && guilds.some((g) => g.id === config.discord.guildId);
      } else {
        isMember = false;
      }
    }

    res.setHeader("Cache-Control", "private, no-cache, no-store");
    res.json({
      user: {
        id: userData.id,
        username: userData.username,
        avatar: userData.avatar 
          ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
          : null,
      },
      token: token,
      isMember,
    });
  } catch (error: any) {
    console.error("Failed to fetch Discord user info:", error.message);
    res.status(500).json({ error: "Failed to fetch user info" });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  clearDiscordAuthCookie(res, req);
  res.setHeader("Cache-Control", "no-store");
  res.json({ success: true });
});

router.get('/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const cookieState = req.cookies?.oauth_state;

  // Clean up state cookie immediately to prevent replay attacks
  res.clearCookie("oauth_state", {
    path: "/",
    sameSite: "lax",
    secure: isSecureRequest(req),
  });

  if (!code) {
    return res.status(400).send("Missing code parameter");
  }

  // CSRF validation: If state was provided, verify it matches
  if (cookieState && state && state !== cookieState) {
    return res.status(403).send("CSRF validation failed: State parameter mismatch or expired session.");
  }

  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const redirectUri = `${protocol}://${host}/auth/discord/callback`;

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: config.discord.clientId!,
        client_secret: config.discord.clientSecret!,
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
      console.error("[Discord OAuth Callback] Token response error:", tokens);
      throw new Error(tokens.error_description || "Failed to get access token");
    }

    // Set cookie with access token for root path
    setDiscordAuthCookie(res, req, tokens.access_token);

    const safeToken = JSON.stringify(tokens.access_token);

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PRTS Discord Authentication</title>
          <meta charset="utf-8">
        </head>
        <body style="background:#09090b;color:#f4f4f5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;">
            <h2 style="margin-bottom:8px;">Авторизация Discord успешна</h2>
            <p style="color:#a1a1aa;font-size:14px;">Окно закроется автоматически...</p>
          </div>
          <script>
            (function() {
              const token = ${safeToken};
              try {
                localStorage.setItem('ak_discord_token', token);
              } catch (e) {}

              if (window.opener) {
                try {
                  window.opener.postMessage({ 
                    type: 'DISCORD_AUTH_SUCCESS', 
                    token: token 
                  }, '*');
                } catch (e) {}
                setTimeout(function() {
                  window.close();
                }, 150);
              } else {
                window.location.href = '/?auth=success';
              }
            })();
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("Discord OAuth error:", error.message);
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
});

export default router;
