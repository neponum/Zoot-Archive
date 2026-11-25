# Поиск и обновление кэша

Два независимых механизма: как сайт находят поисковики и как пользователи
получают свежую версию вместо старой из кэша.

## 1. Что видит поисковик

SPA отдаёт один HTML на все адреса, поэтому до запуска JS поисковик видел
одинаковые `<title>` и описание. Это исправлено на трёх уровнях.

### Статические HTML разделов

После `vite build` скрипт `scripts/generate_static_pages.ts` печёт готовые
страницы из `dist/index.html`:

```
dist/operators/index.html
dist/story/map/index.html
dist/story/grid/index.html
dist/terminal/index.html
dist/chapters/index.html
dist/translate/index.html
dist/integrated-strategies/index.html
dist/reclamation-algorithm/index.html
dist/terra/index.html
dist/storage/index.html
dist/privacy/index.html
dist/disclaimer/index.html
dist/takedown/index.html
```

В каждой — свой `title`, `description`, `canonical`, Open Graph и видимая
текстовая оболочка. В `vercel.json` для этих путей прописаны явные rewrites
на `index.html`, поэтому они открываются как `/operators`, `/story/map` и
т.д. `cleanUrls` намеренно выключен: иначе Vercel убирает `.html` и ломает
прямую ссылку на файл подтверждения Яндекса. Глубокие ссылки
(`/operators/char_002_amiya`, `/story/event/...`) по-прежнему отдают общий
`index.html`, а мета обновляет `usePageMeta` уже в браузере.

### Мета при переходах внутри SPA

`src/hooks/usePageMeta.ts` на каждом маршруте обновляет:

- `document.title` и `<html lang>`;
- `meta[name=description]`, `meta[name=robots]`;
- `link[rel=canonical]` на `https://rhodes.monster/...`;
- `og:title`, `og:description`, `og:url`, `og:locale`;
- `twitter:title`, `twitter:description`;
- JSON-LD `WebSite` + `BreadcrumbList`.

Коды заменяются на имена: `char_002_amiya` → «Amiya»,
`act18d3` → «Под волнами», `SV-6` → «Анорексия». Данные лежат в
`src/data/operatorNames.json` и `src/data/storyTitlesRu.json`.

Служебные страницы (`/storage`, `/terra`, отдельные сцены читалки) помечены
`noindex, follow` — они не должны засорять выдачу.

### sitemap и robots

- `dist/sitemap.xml` генерируется из `src/config/seo.ts` — единый источник
  заголовков, приоритетов и `changefreq`.
- `public/robots.txt` разрешает обход, закрывает `/api/` и `/storage`,
  указывает `Host` и `Sitemap` (важно для Яндекса).

### Соцсети и превью

`public/og-cover.png` — обложка 1200×630. Она используется в `og:image`
и `twitter:image`; раньше там был квадратный значок 512×512, который
обрезался в превью.

## 2. Что сделать вручную

Код не может подтвердить права на сайт в поисковых панелях.

### Google Search Console

1. Добавить ресурс `https://rhodes.monster`.
2. Подтвердить удобным способом. Если через мета-тег — задать в Vercel
   переменную окружения `GOOGLE_SITE_VERIFICATION` и передеплоить.
3. **Sitemaps** → добавить `https://rhodes.monster/sitemap.xml`.
4. **URL Inspection** → запросить переобход главной, `/operators`,
   `/story/map`, `/translate`.

### Яндекс Вебмастер

1. Добавить `https://rhodes.monster`.
2. Подтвердить; для мета-тега — переменная `YANDEX_VERIFICATION`.
3. **Индексирование → Файлы Sitemap** → `https://rhodes.monster/sitemap.xml`.
4. **Индексирование → Переобход страниц** → главная и разделы.
5. Регион сайта — по целевой аудитории (Россия / СНГ).

### Bing Webmaster Tools

Необязательно, но бесплатно: переменная `BING_SITE_VERIFICATION`,
затем импорт из Google Search Console.

### Поддомены

`operators`, `terminal`, `terra`, `translation` отдают те же страницы с
canonical на основной домен. Это правильно: без canonical поисковик
посчитал бы их дублями. Продвигать нужно `rhodes.monster`, а поддомены
работают как короткие ссылки.

## 3. Обновление у пользователей со старым кэшем

Проблема: PWA и HTTP-кэш могли держать старый `index.html`, поэтому человек
видел прошлую версию и не знал, что вышла новая.

### Как это работает

1. При сборке в `index.html` попадает `meta[name="app-build"]`, а в
   `/version.json` — тот же идентификатор.
2. `src/utils/appUpdate.ts` проверяет `/version.json` с `cache: 'no-store'`:
   через 2,5 секунды после загрузки, раз в 10 минут, при возврате во вкладку,
   при фокусе и при появлении сети.
3. Если версии разошлись — снимается service worker, очищается Cache Storage
   и страница один раз перезагружается с `?_v=<build>`.
4. Защита от циклов: для каждой версии перезагрузка выполняется не больше
   одного раза за сессию.

### Заголовки кэша

| Путь | Заголовок |
|---|---|
| `/assets/*` | `public, max-age=31536000, immutable` |
| `/index.html`, `*.html` | `no-cache, no-store, must-revalidate` |
| `/sw.js`, `/version.json` | `no-cache, no-store` |

Те же правила продублированы в `server.ts` для локального продакшена и
Cloud Run.

### Почему старый APK не обновится сам

Android-приложение ставится файлом, поэтому обновление — только новой
сборкой APK. Проверка версии в нём отключена (`platform.kind !== 'web'`).

## 4. Проверка

```bash
# статические страницы и их мета
curl -s https://rhodes.monster/operators | grep -E '<title>|description|canonical'
curl -s https://rhodes.monster/story/map | grep '<title>'

# версия сборки
curl -sI https://rhodes.monster/index.html | grep -i cache-control
curl -s https://rhodes.monster/version.json
```

Ожидаемо: у каждого раздела свой заголовок, `index.html` не кэшируется
надолго, `version.json` содержит свежий `build`.

## 5. Файлы

- `src/config/seo.ts` — заголовки, описания, приоритеты, `noindex`.
- `src/hooks/usePageMeta.ts` — обновление `<head>` в SPA.
- `src/data/operatorNames.json` — имена оперативников для заголовков.
- `src/utils/appUpdate.ts` — проверка новой сборки и сброс кэша.
- `scripts/generate_static_pages.ts` — статические HTML, sitemap, version.json.
- `index.html` — базовая мета и статическая оболочка.
- `public/robots.txt`, `public/og-cover.png`.
