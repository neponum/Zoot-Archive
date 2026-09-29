# 🏛️ ZOOT Archive — Arknights Dossier & Visual Novel Reader

<p align="center">
  <img src="https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/story/obt/main/../avatar/char_002_amiya.png" alt="ZOOT Archive Logo" width="96" height="96" style="border-radius: 50%;" />
</p>

<p align="center">
  <strong>Comprehensive Arknights Lore Dossier, Visual Novel Scenario Player & Community Translation Platform</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License" />
</p>

---

## 🌐 Language / Язык

- [🇷🇺 Русский](#-русский)
- [🇬🇧 English](#-english)

---

## 🇷🇺 Русский

**ZOOT Archive** — это полнофункциональная веб-платформа и архив лора вселенной **Arknights**, включающая полноценный движок визуальной новеллы для воспроизведения сюжетных сценариев игры, базу данных оперативников с интерактивным графом связей на D3.js, музыкальный плеер PRTS, а также верстак для фанатского перевода с поддержкой Google Gemini AI и интеграцией с Discord.

### ✨ Ключевые возможности

- 🎬 **Аутентичный движок визуальной новеллы (`StoryViewer`)**:
  - Полный парсинг сырых сценариев Arknights (`.txt`) с поддержкой всех команд: `[Character]`, `[Background]`, `[Image]`, `[ImageTween]`, `[CameraShake]`, `[Blocker]`, `[Dialog]`, `[Decision]` и стикеров.
  - Точное позиционирование и панорамирование CG-иллюстраций с адаптивным ограничением координат кадра (`normalizeCoordX`/`normalizeCoordY`).
  - Интерактивные развилки и выборы реплик Доктора.
  - Персонализация: динамическая подстановка имени Доктора во всех диалогах (`{@nickname}`, `{$nickname}`, `{nickname}`).
  - Управление воспроизведением: авточтение, регулировка скорости текста, мгновенный пропуск, журнал реплик (Backlog/Log) с возможностью перехода к любой строке и полноэкранный режим.

- 👥 **Досье оперативников и граф связей**:
  - Каталог оперативников с биографиями, записями парадоксов, голосовыми репликами, талантами и модулями.
  - Интерактивная визуализация связей и отношений между персонажами на базе **D3.js** (`OperationRecordsGraph`).

- 🎵 **Аудиосистема PRTS**:
  - Воспроизведение официальных фоновых треков (BGM) и звуковых эффектов (SFX) через Howler.js.
  - Плавное переключение треков (crossfade), фоновое кэширование аудиоресурсов в IndexedDB через `CacheService`.

- ✍️ **Инструмент перевода и сообщество**:
  - Удобный двухпанельный интерфейс для редактирования и вычитки реплик с живым предпросмотром.
  - Контекстно-зависимый ИИ-перевод на базе **Google Gemini API** (`@google/genai`) с учётом канонического глоссария терминов (*Орипатия*, *Родос Айленд*, *Урсус* и т.д.).
  - Система голосования за варианты перевода и отправка готовых работ в Discord через вебхуки.

- 📱 **PWA и кросс-платформенность**:
  - Поддержка установки как Progressive Web App (PWA).
  - Адаптивный интерфейс для мобильных устройств, планшетов и ПК.

---

### 🛠 Технологический стек

| Область | Технологии |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS v4, Motion (Framer Motion v12) |
| **Data Viz & Audio** | D3.js v7, Howler.js v2, Lucide React, PapaParse |
| **Backend** | Express 4, Node.js (`tsx` / `esbuild`), Cookie-Parser, Rate-Limit |
| **AI Translation** | Google Generative AI (`@google/genai` Gemini SDK) |
| **Deploy & Analytics** | Vercel (`@vercel/analytics`, `@vercel/speed-insights`), Docker / Cloud Run |

---

### 🚀 Быстрый старт

#### Требования:
- **Node.js** версии 20.x или выше
- Менеджер пакетов **npm** (или **bun** / **pnpm**)

#### 1. Клонирование репозитория:
```bash
git clone https://github.com/your-username/zoot-archive.git
cd zoot-archive
```

#### 2. Установка зависимостей:
```bash
npm install
```

#### 3. Настройка переменных окружения:
Скопируйте пример файла конфигурации:
```bash
cp .env.example .env
```
Заполните необходимые ключи в файле `.env` (см. таблицу ниже).

#### 4. Запуск в режиме разработки:
```bash
npm run dev
```
Сервер запустится по адресу: `http://localhost:3000`

#### 5. Сборка для продакшена:
```bash
npm run build
npm start
```

---

### ⚙️ Переменные окружения (`.env`)

| Переменная | Описание | Обязательна? |
| :--- | :--- | :---: |
| `GEMINI_API_KEY` | API-ключ Google AI Studio для работы ассистента перевода | Нет (для ИИ) |
| `VITE_DISCORD_CLIENT_ID` | Client ID Discord-приложения для авторизации участников | Нет (для OAuth) |
| `DISCORD_CLIENT_SECRET` | Client Secret Discord-приложения | Нет (для OAuth) |
| `VITE_DISCORD_GUILD_ID` | ID Discord-сервера сообщества | Нет |
| `VITE_SUBMISSION_WEBHOOK_URL`| URL вебхука для отправки переводов на модерацию в Discord | Нет |
| `DISCORD_BUG_WEBHOOK_URL` | URL вебхука Discord для автоматических отчетов об ошибках | Нет |

---

### 📜 Доступные npm-скрипты

- `npm run dev` — Запуск dev-сервера Express + Vite (`server.ts`) на порту 3000.
- `npm run build` — Сборка фронтенда Vite и бандлинг бэкенда в `dist/server.cjs`.
- `npm start` — Запуск скомпилированного продакшен-сервера (`node dist/server.cjs`).
- `npm run lint` — Проверка TypeScript (`tsc --noEmit`).
- `npm run validate:data` — Валидация целостности всех JSON-баз данных в `src/data/`.
- `npm run sync:operators` — Синхронизация карты имен и ID оперативников (`operator_names_map.json`).

---

## 🇬🇧 English

**ZOOT Archive** is a feature-rich web platform and lore archive for **Arknights**, featuring an authentic in-browser visual novel engine to reproduce in-game story scenarios, an interactive operator dossier with a D3.js relationship graph, PRTS music player, and a community translation workbench integrated with Google Gemini AI and Discord.

### ✨ Key Features

- 🎬 **Visual Novel Engine (`StoryViewer`)**:
  - Full-fledged parser for raw Arknights story files (`.txt`), supporting all tags: `[Character]`, `[Background]`, `[Image]`, `[ImageTween]`, `[CameraShake]`, `[Blocker]`, `[Dialog]`, `[Decision]`, stickers, and subtitles.
  - Scale-aware boundary clamping for illustrations (`normalizeCoordX`/`normalizeCoordY`), eliminating black borders and unwanted screen offset.
  - Interactive player choices & branching dialogues.
  - Dynamic Doctor nickname substitution (`{@nickname}`, `{$nickname}`, `{nickname}`) synced with user settings.
  - Player controls: Auto-play, text speed adjustment, instant skip, backlog/log viewer with jump-to-line capability, and full-screen toggle.

- 👥 **Operator Dossier & Relationship Graph**:
  - Operator handbook, voice lines player, paradox simulations, talents, and modules.
  - Interactive operator connection network powered by **D3.js** (`OperationRecordsGraph`).

- 🎵 **PRTS Audio Engine**:
  - Background music (BGM) and sound effects (SFX) streaming via Howler.js.
  - Smooth volume fading and crossfades, client-side caching in IndexedDB via `CacheService`.

- ✍️ **Community Translation & AI Workbench**:
  - Side-by-side editing interface with real-time story preview.
  - AI translation assistance via **Google Gemini API** (`@google/genai`) grounded with the canonical Arknights glossary.
  - Translation voting system and direct Discord webhook submission.

- 📱 **PWA & Responsive Design**:
  - Installable Progressive Web App (PWA).
  - Optimized for desktop, tablet, and mobile viewports.

---

### 🛠 Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS v4, Motion (Framer Motion v12) |
| **Data Viz & Audio** | D3.js v7, Howler.js v2, Lucide React, PapaParse |
| **Backend** | Express 4, Node.js (`tsx` / `esbuild`), Cookie-Parser, Express Rate Limit |
| **AI Translation** | Google Generative AI (`@google/genai` Gemini SDK) |
| **Deployment** | Vercel (`@vercel/analytics`, `@vercel/speed-insights`), Docker / Cloud Run |

---

### 🚀 Getting Started

#### Prerequisites:
- **Node.js** version 20.x or higher
- **npm** (or **bun** / **pnpm**)

#### 1. Clone Repository:
```bash
git clone https://github.com/your-username/zoot-archive.git
cd zoot-archive
```

#### 2. Install Dependencies:
```bash
npm install
```

#### 3. Setup Environment Variables:
Copy the template configuration:
```bash
cp .env.example .env
```
Fill in the values in `.env` as needed.

#### 4. Run Development Server:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

#### 5. Build for Production:
```bash
npm run build
npm start
```

---

### ⚙️ Environment Variables (`.env`)

| Variable | Description | Required? |
| :--- | :--- | :---: |
| `GEMINI_API_KEY` | Google AI Studio API key for AI translation features | Optional |
| `VITE_DISCORD_CLIENT_ID` | Discord Application Client ID for OAuth login | Optional |
| `DISCORD_CLIENT_SECRET` | Discord Application Client Secret | Optional |
| `VITE_DISCORD_GUILD_ID` | Discord Community Server ID | Optional |
| `VITE_SUBMISSION_WEBHOOK_URL`| Discord webhook URL for receiving story translations | Optional |
| `DISCORD_BUG_WEBHOOK_URL` | Discord webhook URL for automated bug reports | Optional |

---

### 📜 Developer Scripts

- `npm run dev` — Starts full-stack dev server (`server.ts` running Express + Vite middlewares).
- `npm run build` — Builds frontend client and bundles backend to `dist/server.cjs`.
- `npm start` — Executes production server bundle (`node dist/server.cjs`).
- `npm run lint` — Performs strict TypeScript check (`tsc --noEmit`).
- `npm run validate:data` — Validates JSON databases in `src/data/` for syntax and schema integrity.
- `npm run sync:operators` — Re-generates `src/data/operator_names_map.json` from the operators dataset.

---

### 📂 Project Structure

```
zoot-archive/
├── public/                 # Static assets, icons, manifest
├── scripts/                # Data validation & synchronization scripts
├── server/                 # Express backend routes, Discord OAuth, proxy & voting
├── src/
│   ├── components/         # React views (ChapterSelector, StoryViewer, Dossier)
│   │   ├── story/          # Visual novel layers (Background, Character, Dialogue, UI)
│   │   └── ui/             # Reusable UI components
│   ├── config/             # Arknights lore glossary & constants
│   ├── data/               # Operators database, tags & translations
│   ├── hooks/              # Custom hooks (useStoryReducer, useStoryControls, etc.)
│   ├── lib/                # Utility helpers & styling functions
│   ├── services/           # Story parser, asset service, audio manager & tree service
│   ├── types/              # Domain TypeScript interfaces
│   └── App.tsx             # Root router & layout
├── server.ts               # Express application entry point
├── package.json
└── vite.config.ts
```

---

### 📜 Credits & Acknowledgments

This project relies on data, tools, and assets provided by the global Arknights community:
- **[ArknightsGameData](https://github.com/Kengxxiao/ArknightsGameData)** by Kengxxiao: Primary source for CN story scripts and game data.
- **[ArknightsGameData_YoStar](https://github.com/Kengxxiao/ArknightsGameData_YoStar)** by Kengxxiao: Source for Global (EN/JP/KR) game data.
- **[PRTS.wiki](https://prts.wiki/)**: High-resolution story illustrations, character sprites, and audio assets.

*Disclaimer: ZOOT Archive is a non-commercial fan-made project and is not affiliated with or endorsed by Hypergryph, Studio Montagne, or Yostar. Arknights game assets and intellectual property belong to their respective owners.*
