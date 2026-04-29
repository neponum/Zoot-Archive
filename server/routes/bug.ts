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
    // В Discord для пинга нужно использовать числовой ID пользователя: <@USER_ID> или роли: <@&ROLE_ID>
    const DISCORD_USER_IDS: Record<string, string> = {
      'nep0num': '328845926628065291', // Замените на числовой ID (например '123456789012345')
      'frostymisery17': '696376643492511776',
      'naoshka_v': '1211553016919097355'
    };
    
    // Вставьте ID роли разработчиков, если нужно (<@&ROLE_ID>)
    const DEV_ROLE_ID = 'ВСТАВЬТЕ_ID_РОЛИ_СЮДА'; 
    const devRoleMention = DEV_ROLE_ID !== 'ВСТАВЬТЕ_ID_РОЛИ_СЮДА' ? `<@&${DEV_ROLE_ID}>` : '';

    const translatorName = context.translator || 'Переводчика';
    
    // Пытаемся получить ID из словаря, если нет - просто пишем имя
    const translatorMentionId = DISCORD_USER_IDS[translatorName] || DISCORD_USER_IDS['nep0num'];
    const tag = translatorMentionId !== 'ВСТАВЬТЕ_ВАШ_DISCORD_ID_СЮДА' 
      ? `<@${translatorMentionId}>` 
      : `@${translatorName}`;

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
      content: `Внимание: ${tag} ${devRoleMention}`.trim(),
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
