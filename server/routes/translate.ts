import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import { extractDiscordToken } from '../utils/authHelper.js';

export const router = Router();

// Translation rate limiter to prevent API abuse and stay under standard quotas
const translateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 mins
  message: { error: "Too many translation requests from this IP" }
});

router.post('/', translateLimiter, async (req: Request, res: Response) => {
  const customApiKey = req.body.customApiKey;
  const token = extractDiscordToken(req);

  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY_MISSING" });
  }

  const { model, contents, config } = req.body;

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: model || 'gemini-3.7-flash',
      config: config || {},
      contents: contents,
    });

    res.json({ text: response.text });
  } catch (err: any) {
    console.error("Gemini translate proxy error:", err);
    res.status(err.status || 500).json({ 
      error: err.message || "Failed to make Gemini API request",
      status: err.status 
    });
  }
});

export default router;
