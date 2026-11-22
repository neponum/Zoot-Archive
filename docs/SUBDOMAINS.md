# Домены третьего уровня

Короткие адреса для основных разделов:

| Домен | Что открывает | Внутренний путь |
|---|---|---|
| `operators.rhodes.monster` | Архив оперативников | `/operators` |
| `terminal.rhodes.monster` | Терминал / главный экран | `/terminal` |
| `terra.rhodes.monster` | Раздел «Терра» | `/terra` |
| `translation.rhodes.monster` | Браузер переводов | `/translate` |

Поддомены **не редиректят на основной домен**: раздел остаётся на своём
адресе. Например, `operators.rhodes.monster/char_002_amiya` открывает
`/operators/char_002_amiya`, а `terminal.rhodes.monster/story/event/...`
оставляет глобальный путь читалки как есть.

## Что уже сделано в коде

- `src/utils/subdomains.ts` — карта хостов и редирект до первого рендера
  React (без вспышки главной страницы). Работает и на Vercel, и на
  собственном Express/Cloud Run.
- `vercel.json` — серверные редиректы корня каждого поддомена
  (`/` → нужный раздел). Они срабатывают даже без JavaScript.
- Глубокие ссылки без префикса (`operators.rhodes.monster/char_002_amiya`)
  обрабатывает клиентский слой.

## Настройка DNS

Для Vercel у каждого поддомена — CNAME на `cname.vercel-dns.com`:

```
operators    CNAME  cname.vercel-dns.com.
terminal     CNAME  cname.vercel-dns.com.
terra        CNAME  cname.vercel-dns.com.
translation  CNAME  cname.vercel-dns.com.
```

Если DNS-провайдер не поддерживает CNAME на корне, это не наш случай:
все четыре имени — обычные поддомены, CNAME работает.

После добавления записей:

1. Vercel → Project → **Settings → Domains**.
2. Добавить `operators.rhodes.monster`, `terminal.rhodes.monster`,
   `terra.rhodes.monster`, `translation.rhodes.monster`.
3. Дождаться статуса **Valid Configuration** — TLS-сертификат Vercel
   выпустит автоматически.

### Вариант с wildcard

Можно добавить в Vercel `*.rhodes.monster` и DNS-запись:

```
*  CNAME  cname.vercel-dns.com.
```

Тогда любой поддомен будет открывать сайт. Минус: неизвестные поддомены
(`test.rhodes.monster`) тоже начнут отвечать. Если нужны только четыре
адреса — добавляйте их по отдельности.

### Cloudflare

Если DNS ведётся в Cloudflare:

- включите **DNS only** (серое облако) на время проверки;
- либо используйте CNAME flattening — Vercel принимает такое подключение.

## Другой хостинг (Cloud Run / свой сервер)

Код редиректа от хостинга не зависит. Нужно:

1. Привязать четыре домена к сервису.
2. Выпустить сертификат на все имена (SAN) или wildcard `*.rhodes.monster`.
3. Направить DNS на балансировщик/сервер.

Express отдаёт `index.html` на любой путь, поэтому после DNS всё работает
без дополнительных маршрутов.

## Проверка

DNS:

```bash
dig +short operators.rhodes.monster
dig +short terminal.rhodes.monster
```

Локально, без правки `/etc/hosts` (Chrome подставит IP сам):

```bash
google-chrome \
  --host-resolver-rules="MAP operators.rhodes.monster 127.0.0.1, MAP terminal.rhodes.monster 127.0.0.1" \
  http://operators.rhodes.monster:3000/
```

Ожидаемо: адрес меняется на `/operators`, открывается архив оперативников.
