import { Router } from 'express';
import { config } from '../config.js';

const router = Router();

router.get('/url', (req, res) => {
  if (!config.discord.clientId) {
    return res.status(500).json({ error: "Discord Client ID not configured" });
  }

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const redirectUri = `${protocol}://${host}/auth/discord/callback`;

  const params = new URLSearchParams({
    client_id: config.discord.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds",
  });

  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=600");
  res.json({ url: `https://discord.com/api/oauth2/authorize?${params}` });
});

router.get('/user', async (req, res) => {
  const token = req.cookies.discord_token;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userData = await userResponse.json();

    const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const guilds = await guildsResponse.json();

    const isMember = config.discord.guildId 
      ? guilds.some((g: any) => g.id === config.discord.guildId)
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

router.post('/logout', (req, res) => {
  res.clearCookie("discord_token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.json({ success: true });
});

router.get('/callback', async (req, res) => {
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

export default router;
