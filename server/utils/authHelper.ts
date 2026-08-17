import { Request, Response } from 'express';

/**
 * Extracts Discord access token from either cookies, Authorization header,
 * or custom X-Discord-Token header.
 */
export function extractDiscordToken(req: Request): string | null {
  // 1. Check HTTP-only cookie
  if (req.cookies && typeof req.cookies.discord_token === 'string' && req.cookies.discord_token.trim()) {
    return req.cookies.discord_token.trim();
  }

  // 2. Check Authorization header (Bearer <token>)
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }

  // 3. Check X-Discord-Token custom header
  const customHeader = req.headers['x-discord-token'];
  if (customHeader && typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim();
  }

  return null;
}

/**
 * Determines if request was made via HTTPS / behind a TLS proxy (Vercel, Cloud Run, Cloudflare).
 */
export function isSecureRequest(req: Request): boolean {
  return (
    req.protocol === 'https' ||
    req.headers['x-forwarded-proto'] === 'https' ||
    req.headers['x-forwarded-ssl'] === 'on' ||
    process.env.NODE_ENV === 'production'
  );
}

/**
 * Sets persistent, domain-wide Discord auth cookie with cross-browser compatibility.
 */
export function setDiscordAuthCookie(res: Response, req: Request, token: string): void {
  const secure = isSecureRequest(req);
  
  // Use SameSite=Lax for normal first-party navigation (reliable in Safari/iOS)
  // or SameSite=None when running in cross-site iframe environments.
  const isIframe = req.headers['sec-fetch-dest'] === 'iframe';
  const sameSite = isIframe && secure ? 'none' : 'lax';

  res.cookie('discord_token', token, {
    httpOnly: true,
    secure: secure,
    sameSite: sameSite,
    path: '/', // Explicit root path ensures cookie is sent on all API and page routes
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

/**
 * Clears Discord auth cookie across all paths.
 */
export function clearDiscordAuthCookie(res: Response, req: Request): void {
  const secure = isSecureRequest(req);
  res.clearCookie('discord_token', {
    httpOnly: true,
    secure: secure,
    sameSite: 'lax',
    path: '/',
  });
}
