import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

export const router = Router();

/**
 * Отчёты об ошибках отправляются анонимно: без Discord-авторизации и без
 * идентификаторов пользователя. Единственное ограничение — частота запросов
 * с одного IP, чтобы форма не превратилась в спам-канал.
 */
const reportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много отчётов с этого адреса. Попробуйте позже.' },
});

interface HistoryEntry {
  speaker: string;
  text: string;
}

interface BugReportBody {
  type?: string;
  description?: string;
  context?: {
    chapter?: string;
    line?: string | number;
    history?: Array<{ speaker?: unknown; text?: unknown }>;
    translator?: string;
  };
}

/**
 * Реестр Discord ID переводчиков проекта.
 * Публичные Discord ID переводчиков безопасно хранятся в кодовой базе для точечных упоминаний в баг-репортах.
 */
export const TRANSLATOR_DISCORD_IDS: Record<string, string> = {
  'nep0num': '328845926628065291',
  'neponum': '328845926628065291',
  'frostymisery17': '696376643492511776',
  'naoshka_v': '1211553016919097355',
  'neksi0762': '328845926628065291',
  'ilarhion': '328845926628065291',
};

function getTranslatorDiscordIds(): Record<string, string> {
  return TRANSLATOR_DISCORD_IDS;
}

router.post('/', reportLimiter, async (req: Request, res: Response) => {
  const { type, description, context } = req.body as BugReportBody;

  // Strict Input Validation & Sanitization
  if (typeof type !== 'string' || !['player', 'translation'].includes(type)) {
    return res.status(400).json({ error: "Invalid report type" });
  }

  if (typeof description !== 'string' || description.trim().length === 0) {
    return res.status(400).json({ error: "Description must be a non-empty string" });
  }

  const cleanDescription = description.trim().slice(0, 2000);

  if (!context || typeof context !== 'object') {
    return res.status(400).json({ error: "Context is required and must be an object" });
  }

  const cleanChapter = typeof context.chapter === 'string' ? context.chapter.trim().slice(0, 200) : 'Неизвестно';
  const cleanLine = context.line !== undefined && context.line !== null ? String(context.line).slice(0, 10) : 'Неизвестно';
  const rawHistory = Array.isArray(context.history) ? context.history : [];
  const cleanHistory: HistoryEntry[] = rawHistory
    .slice(0, 30)
    .map((h) => ({
      speaker: typeof h?.speaker === 'string' ? h.speaker.trim().slice(0, 100) : 'Narrator',
      text: typeof h?.text === 'string' ? h.text.trim().slice(0, 500) : ''
    }))
    .filter((h) => h.text.length > 0);

  const cleanTranslator = typeof context.translator === 'string' ? context.translator.trim().slice(0, 100) : 'Переводчик';

  const webhookUrl = process.env.DISCORD_BUG_WEBHOOK_URL || process.env.DISCORD_SUBMISSION_WEBHOOK_URL || process.env.VITE_SUBMISSION_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(500).json({ error: "Webhook URL not configured" });
  }

  try {
    const translatorMap = getTranslatorDiscordIds();
    const translatorMentionId = translatorMap[cleanTranslator.toLowerCase()] || translatorMap[cleanTranslator] || translatorMap['nep0num'];
    const translatorTag = translatorMentionId ? `<@${translatorMentionId}>` : `@${cleanTranslator}`;

    let historyText = cleanHistory.map((h) => `**${h.speaker}**: ${h.text}`).join('\n');
    if (historyText.length > 1000) historyText = historyText.slice(-1000) + '...';

    const embed = {
      title: `🚨 Новый баг-репорт: ${type === 'player' ? 'Ошибка в плеере' : 'Ошибка перевода'}`,
      description: cleanDescription,
      color: type === 'player' ? 0xff0000 : 0x00ff00,
      fields: [
        { name: 'Глава', value: cleanChapter, inline: true },
        { name: 'Строка (Индекс)', value: cleanLine, inline: true },
        { name: 'Контекст (Лог)', value: historyText || 'Пусто' },
        { name: 'Отправитель', value: 'Анонимный отчёт (без авторизации)' }
      ],
      timestamp: new Date().toISOString()
    };

    const payload = {
      content: `Внимание: ${translatorTag}`.trim(),
      embeds: [embed]
    };

    const whRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!whRes.ok) {
      const errTxt = await whRes.text();
      console.error("[BugRoute] Webhook error response:", errTxt);
      return res.status(500).json({ error: "Failed to send bug report webhook" });
    }

    return res.json({ success: true });
  } catch (err: unknown) {
    console.error("[BugRoute] Bug report error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
