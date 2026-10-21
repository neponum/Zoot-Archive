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

---

## 6. Certificate Authority Compromise — eMudhra (2026-10-20)

### What happened

On 17 October 2026 a researcher reported to the Chrome Root Program, Mozilla, Apple and
Microsoft that the private keys of **eight intermediate CA certificates** operated by
**eMudhra** (Indian PKI provider, public TLS brand *emSign*) were compromised. The P-384
keys had been generated with insufficient entropy: each private key is an integer below
256 and can be recovered from the public certificate in under a second. A holder of such
a key can issue a trusted certificate for **any** domain and mount a man-in-the-middle
attack. The six TLS intermediates chain to `emSign Root TLS CA - G3` → `emSign ECC Root CA - G3`;
two more were code-signing CAs.

Response timeline:

| Date (UTC) | Action |
|---|---|
| 17 Oct | Report received; Chrome lands a CRLSet block on the SPKI hashes (19:45), Mozilla blocks via OneCRL (22:59) |
| 18 Oct | eMudhra revokes the eight CAs (`cACompromise`); Sectigo revokes its cross-certificates |
| 19 Oct | Apple blocks; Python `certifi` 2026.10.19, Rust `webpki-roots` 1.0.10, Go 1.27.3 / 1.26.10 |
| 20 Oct | Microsoft blocks; Mozilla ships Firefox 158.0.1 + ESR builds and removes `emSign ECC Root CA - G3` from NSS 3.131.1 |
| 27 Oct | Chrome Root Store v43 removes `emSign ECC Root CA - G3` — **sites whose certificate chains to it stop working in Chrome** |

No fraudulent certificate was found in Certificate Transparency logs, and the affected
intermediates issued no public end-entity certificates (eMudhra confirmed this, Mozilla
verified it independently). Chrome, Firefox, Apple and Microsoft users are already
protected; the risk is concentrated in clients that never fetch revocation data.

### What we checked on our side

| Surface | Result |
|---|---|
| Our own certificate (`zoot-archive.vercel.app`) | `*.vercel.app` ← Google Trust Services **WR1** ← GTS Root R1 ← GlobalSign Root CA. **Does not touch emSign** — unaffected, including the 27 Oct Chrome Root Store change |
| TLS versions | TLS 1.0/1.1 rejected, only 1.2/1.3 accepted |
| HSTS | `max-age=63072000; includeSubDomains; preload` (Vercel edge) |
| Node runtime trust store (`tls.rootCertificates`) | Still contains `emSign ECC Root CA - G3` — Node bundles its own Mozilla-derived store and ignores the OS one, `--use-openssl-ca` is a no-op in official builds |
| OS trust store (`ca-certificates` 20260816) | Patched — the affected roots are already gone |
| Python `certifi` | Updated to 2026.10.19 — `emSign ECC Root CA - G3`, `emSign Root TLS CA - G3` and `Comodo AAA Certificate Services` removed (the unaffected eMudhra roots were restored) |
| Bundled CA files in the repo | None — no `.crt`/`.pem`, no `NODE_EXTRA_CA_CERTS`, no `rejectUnauthorized: false` |
| User-facing code | No certificate installation prompts, no pinned roots, no third-party scripts in `index.html` |

### Residual risk and how we handle it

The only remaining exposure is **outbound** TLS from the server: `/api/proxy` fetches
artwork, catalogs and lyrics from `torappu.prts.wiki`, `raw.githubusercontent.com`,
`monster-siren.hypergryph.com` and `web.hycdn.cn`, and re-serves that content to
visitors. A MITM attacker on the path could present a certificate for one of those
hosts signed by a compromised intermediate. Mitigations in place:

- the proxy only accepts an explicit allowlist of hosts (no open proxy, no user-supplied
  hosts), so the blast radius is limited to four known origins;
- all of them are served over plain public TLS with Certificate Transparency logging;
- no certificate was ever issued under the compromised intermediates, so there is nothing
  to replay today.

`npm run check:runtime` audits the trust store of the current runtime and of the OS and exits
with code 1 while a compromised root is present — wire it into CI once a CI workflow
exists, and re-run it after every Node/runtime upgrade:

```bash
npm run check:runtime     # exit 1 if the runtime is unsafe
npm run check:runtime:warn # same check, but only a warning
```

Once Node (and the Vercel runtime) ships its own store update, the check turns green
and this section can be closed.

---

## 7. Node.js Security Releases — 21 October 2026

On 21 October 2026 the Node.js project published security releases for the **26.x, 24.x and
22.x** lines. The highest severity is HIGH, and the most relevant for this codebase are the
TLS hostname-validation bypasses — `/api/proxy` fetches third-party assets over HTTPS and
validates the certificate chain, so a client that trusts a broken hierarchy could be served
forged artwork, catalogs or lyrics.

| CVE | Severity | Affected | Impact here |
|---|---|---|---|
| CVE-2026-105483 | HIGH | 26.x, 24.x | TLS hostname bypass (IP written with fullwidth digits) — affects our outbound fetches |
| CVE-2026-106069 | HIGH | 26.x, 24.x, 22.x | TLS hostname bypass when a host loosely resolves to an IP — interacts with the SSRF guard in `/api/proxy` |
| CVE-2026-111497 | HIGH | 26.x, 24.x, 22.x | Brotli decoder out-of-bounds write → remote code execution (undici decodes `br` responses) |
| CVE-2026-105482 | HIGH | 26.x, 24.x, 22.x | `dns.resolve` truncates names containing a NUL character |
| CVE-2026-106072 | MEDIUM | 26.x, 24.x, 22.x | Improper certificate validation for non-canonical IPv4 hostnames — directly relevant to the private-IP blacklist |
| CVE-2026-105481 | MEDIUM | 26.x, 24.x, 22.x | keep-alive socket processes a response written before the request was sent |
| CVE-2026-106074 | MEDIUM | 26.x, 24.x, 22.x | `crypto.randomUUID()` / `randomInt()` entropy cache is persisted into startup snapshots, so every process repeats the same values |
| CVE-2026-106070 | LOW | 26.x | `ZipFile` returns attacker-controlled prefix bytes after failed ZIP header validation |
| CVE-2026-106071 | LOW | 26.x | Permission Model filesystem over-grant via wildcard radix lookup |
| CVE-2026-106073 | LOW | 26.x, 24.x, 22.x | Permission Model bypass with `fs.realpathSync` |

The release also ships the **`ca-cert` update for the eMudhra compromise** described in
section 6 — the compromised `emSign ECC Root CA - G3` and its cross-signs are removed from
Node's bundled root store.

**Fixed versions: 22.23.4, 24.22.1, 26.12.1.**

### What we did

- **Local runtime upgraded to Node 24.22.1** (LTS «Krypton»), installed in the user's own
  directory (`~/.local/node/node-v24.22.1-linux-x64`) with symlinks in `~/.local/bin` — no
  system-wide directories touched.
- **`engines.node: ">=24.22.1"`** added to `package.json`, so a deployment on an outdated
  runtime is rejected instead of silently running a vulnerable one.
- **Startup warning** in `server.ts`: the server logs a `[SECURITY]` line when it detects a
  Node.js older than the patched release of its branch (22.23.4 / 24.22.1 / 26.12.1).
- **`npm run check:runtime`** (script `scripts/check_runtime.mjs`) now checks both the Node
  version and the trusted root store; it exits with code 1 while either is unsafe, so the
  check can be wired into CI. After the upgrade it reports the runtime as clean: the
  compromised eMudhra root is gone from the bundled store (118 roots instead of 145).
- The system trust store (`ca-certificates` 20260816) and Python's `certifi` (2026.10.19)
  were updated as well.
