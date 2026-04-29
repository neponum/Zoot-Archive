import { Router } from 'express';
export const router = Router();

router.post('/', async (req, res) => {
  const token = req.cookies?.discord_token;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { type, description, context } = req.body;
  // context = { chapter, line, history }

  const webhookUrl = process.env.DISCORD_BUG_WEBHOOK_URL || process.env.VITE_SUBMISSION_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(500).json({ error: "Webhook URL not configured" });
  }

  try {
    // 1. Fetch user data (to attach to report)
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const userData = await userRes.json();
    if (!userData || !userData.id) {
      return res.status(401).json({ error: "Failed token" });
    }

    // 2. Format message
    // nep0num's Discord ID is unknown or maybe I can just tag them by name, e.g. <@nep0num.id>? Wait, they literally said "меня nep0num" so tagging `<@nep0num>` might not work unless we have their discord ID, but we can just say "Ping: @nep0num" or ping the translator. For now, text representation:
    const tag = type === 'player' ? '<@nep0num> (nep0num)' : 'Переводчик';

    // Discord message embeds
    let historyText = (context.history || []).map((h: any) => `**${h.speaker || 'Narrator'}**: ${h.text}`).join('\n');
    if (historyText.length > 1000) historyText = historyText.slice(-1000) + '...';

    const embed = {
      title: `🚨 Новый баг-репорт: ${type === 'player' ? 'Ошибка в плеере' : 'Ошибка перевода'}`,
      description: description,
      color: type === 'player' ? 0xff0000 : 0x00ff00,
      fields: [
        { name: 'Глава', value: context.chapter || 'Неизвестно', inline: true },
        { name: 'Строка (Индекс)', value: String(context.line || 'Неизвестно'), inline: true },
        { name: 'Контекст (Лог)', value: historyText || 'Пусто' },
        { name: 'Отправитель', value: `<@${userData.id}> (${userData.username})` }
      ],
      timestamp: new Date().toISOString()
    };

    const playload = {
      content: `Внимание: ${tag}`,
      embeds: [embed]
    };

    const whRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(playload)
    });

    if (!whRes.ok) {
      const errTxt = await whRes.text();
      console.error("Webhook error:", errTxt);
      return res.status(500).json({ error: "Failed to send webhook" });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("Bug report error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
export default router;
