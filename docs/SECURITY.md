# 🛡️ Zoot Archive — Security Architecture & Hardening Guide

This document details the security posture, threat model, mitigation strategies, and defensive implementations across Zoot Archive.

---

## 1. Threat Model & Attack Surface

Zoot Archive operates a client-facing React frontend backed by an Express server. The primary threat surfaces are:

1. **Server-Side Request Forgery (SSRF) & Open Proxy Abuse** via `/api/proxy`:
   - Risk: Attackers proxy arbitrary internal requests (e.g. `http://169.254.169.254/computeMetadata/v1/` on Cloud Run or internal port scans on `localhost`).
   - Risk: Malicious actors using the server as an open proxy for botnets or abusive content.
2. **Cross-Site Request Forgery (CSRF)** on Discord OAuth2 endpoints:
   - Risk: Login CSRF or state tampering forcing users into an attacker-controlled Discord session.
3. **Session Hijacking & Cookie Theft**:
   - Risk: Access token extraction via client-side script injection.
4. **Cross-Site Scripting (XSS)** in Rich-Text Visual Novel Dialogue:
   - Risk: Malicious scripts embedded into community translations, character names, or rich text tags.
5. **Denial of Service (DoS) & API Abuse**:
   - Risk: Flooding translation endpoints (Gemini API quota exhaustion) or spamming Discord webhook channels with fake bug reports.

---

## 2. Defensive Measures & Implementation Matrix

### A. SSRF & Proxy Hardening (`server/routes/proxy.ts`)

The `/api/proxy` endpoint exists strictly to bypass browser CORS for static Arknights game assets (audio, illustrations, databases). It enforces five layered guards:

1. **Protocol Restriction**:
   ```typescript
   if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
     return res.status(400).json({ error: "Invalid target protocol: Only HTTP/HTTPS allowed" });
   }
   ```
2. **Private & Cloud Metadata Address Blacklist**:
   Directly rejects requests to:
   - `localhost`, `127.0.0.1`, `::1`, `0.0.0.0`
   - `169.254.169.254` (Cloud instance metadata services)
   - RFC 1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
3. **Strict Domain & Path Allowlisting**:
   Only explicit, trusted Arknights asset providers are permitted:
   - `https://torappu.prts.wiki/`
   - `https://prts.wiki/`
   - `https://monster-siren.hypergryph.com/`
   - `https://web.hycdn.cn/`
   - `https://fastly.jsdelivr.net/`
   - `https://raw.githubusercontent.com/` restricted specifically to known Arknights data repositories:
     - `Kengxxiao/ArknightsGameData`
     - `Kengxxiao/ArknightsGameData_YoStar`
     - `neponum/zoot-data`
     - `fexli/ArknightsResource`
     - `Aceship/AN-EN-Tags`
4. **Path Traversal Protection**:
   All incoming paths are normalized via `path.posix.normalize()`. Requests containing `..` or double-encoded traversal sequences are rejected with HTTP 403.
5. **Rate Limiting**:
   Protected by `proxyLimiter` capped at 10,000 requests per 15-minute window per IP.

---

## 3. Discord OAuth2 Security (`server/routes/auth.ts`)

### Cryptographic State Validation
1. When initiating OAuth (`/api/auth/discord/url` or `/redirect`), a cryptographically secure 16-byte random token is generated:
   ```typescript
   const state = crypto.randomBytes(16).toString('hex');
   ```
2. The state is saved in a short-lived (15 min) cookie:
   ```typescript
   res.cookie("oauth_state", state, {
     httpOnly: true,
     secure: isSecureRequest(req),
     sameSite: "lax",
     path: "/",
     maxAge: 15 * 60 * 1000,
   });
   ```
3. In the OAuth callback (`/auth/discord/callback`):
   ```typescript
   if (!state || !cookieState || state !== cookieState) {
     return res.status(403).send("CSRF validation failed: State parameter mismatch or expired session.");
   }
   ```
   Both the query parameter and the cookie MUST be present and match. The state cookie is immediately cleared on arrival to prevent replay attacks.

### Session Cookie Flags
- `httpOnly: true`: JavaScript cannot read or extract the authentication cookie.
- `secure: true` (in production/HTTPS): Never sent across unencrypted HTTP connections.
- `sameSite: "lax"`: Prevents CSRF while allowing seamless top-level navigation redirects.

---

## 4. XSS Prevention & Client Sanitization

### Visual Novel Dialogue & Typewriter (`src/lib/textUtils.ts`)
- Script text containing tags like `<color=...>`, `<b>`, `<i>`, `<size=...>` is parsed into structured AST tokens (`TextSegment[]`).
- Attributes are strictly validated:
  - `color`: Must match Hex regex `^#[0-9a-fA-F]{3,8}$`, valid RGB/RGBA, or known CSS color names. Characters like `;`, `{`, `}`, `url` are discarded.
  - `size`: Must match clean numeric patterns with optional units (`px`, `pt`, `rem`, `em`, `%`).
- In `Typewriter.tsx`, text segments are rendered as **plain React text children** (`<span>{textToShow}</span>`), never using `dangerouslySetInnerHTML`.

### Doctor Nickname Sanitization (`StoryViewer.tsx`)
Player nicknames are escaped during string replacement. Regular expressions matching `{@nickname}`, `{$nickname}`, `{nickname}` replace occurrences with string literals, ensuring that user inputs containing HTML or script syntax cannot execute in the DOM.

---

## 5. Security Headers & Rate Limiting (`server.ts`)

Every HTTP response includes standard defensive headers:

```typescript
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  next();
});
```

### Rate Limiting Hierarchy
1. **Global Limiter**: 1,000 requests per 15 minutes per IP across all endpoints.
2. **Proxy Limiter**: 10,000 requests per 15 minutes per IP.
3. **Bug Report Limiter**: 10 requests per 1 hour per IP (prevents Discord webhook spam).
4. **Translate Limiter**: 120 requests per 15 minutes per IP (protects Gemini API quota).
