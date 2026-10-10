import { Router, Request, Response } from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';

export const router = Router();

/**
 * Translation submissions are proxied through the server so the Discord webhook
 * URL never reaches the client bundle. The webhook URL is a bearer-like secret:
 * anyone who extracts it can spam or delete the webhook.
 */
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 submissions per hour per IP
  message: { error: "Too many submissions from this IP, please try again later" }
});

// Discord webhook attachments are limited to 10 files / 10MB per message
const MAX_BODY_BYTES = 25 * 1024 * 1024;

function getSubmissionWebhookUrl(): string | undefined {
  // Server-side variable takes precedence; VITE_ fallback kept for existing deployments
  return process.env.DISCORD_SUBMISSION_WEBHOOK_URL || process.env.VITE_SUBMISSION_WEBHOOK_URL || undefined;
}

router.get('/status', (_req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ enabled: !!getSubmissionWebhookUrl() });
});

router.post(
  '/',
  submitLimiter,
  express.raw({ type: 'multipart/form-data', limit: MAX_BODY_BYTES }),
  async (req: Request, res: Response) => {
    const webhookUrl = getSubmissionWebhookUrl();
    if (!webhookUrl) {
      return res.status(503).json({ error: "SUBMISSION_NOT_CONFIGURED" });
    }

    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.toLowerCase().startsWith('multipart/form-data')) {
      return res.status(400).json({ error: "Expected multipart/form-data payload" });
    }

    if (!req.body || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: "Empty submission payload" });
    }

    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: req.body
      });

      if (!webhookResponse.ok) {
        const details = await webhookResponse.text().catch(() => '');
        console.error(`[SubmitRoute] Discord webhook rejected submission: ${webhookResponse.status} ${details.slice(0, 200)}`);
        return res.status(502).json({ error: "Failed to forward submission to Discord" });
      }

      return res.json({ success: true });
    } catch (err: unknown) {
      console.error("[SubmitRoute] Submission error:", err);
      return res.status(500).json({ error: "Internal server error during submission" });
    }
  }
);

export default router;
