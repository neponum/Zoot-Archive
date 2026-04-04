# Zoot Archive

A professional web-based tool designed for Arknights fans and translators to parse, translate, and manage story scripts with ease. Powered by Google Gemini AI for context-aware translations and integrated with Discord for community submissions.

## ✨ Features

- **Advanced Script Parsing**: Automatically detects dialogue, character names, backgrounds, and system commands from raw Arknights story files (`.txt`).
- **Gemini AI Integration**: Context-aware translation that understands character gender, relationships, and Arknights-specific terminology.
- **Discord Integration**: Securely submit translations to a Discord server via Webhooks, with OAuth2 authentication to verify community members.
- **Batch Translation**: Translate entire chapters in seconds with smart batching to respect API quotas.
- **Character Awareness**: Specifically optimized for Russian (and other gendered languages) to ensure correct verb/adjective endings based on character names.
- **Multi-Language Support**: Support for CN, EN, JP, KR, RU, and many more.
- **Persistent Storage**: Your progress is automatically saved in your browser's local storage.
- **Export Options**: Export your translations back to Arknights-compatible script formats or clean JSON/TXT.
- **Responsive Dark UI**: A sleek, high-performance interface inspired by the Arknights "Rhodes Island" aesthetic.

## 🚀 Deployment

### Deploying to Vercel (Recommended)

Since this is a full-stack app, Vercel is the easiest way to host it:

1. **Export to GitHub**: Use the AI Studio export tool.
2. **Import to Vercel**: Connect your GitHub repository to Vercel.
3. **Configure Environment Variables**: In Vercel Project Settings, add all variables from `.env.example`.
4. **Update Discord Redirect URI**: Add `https://your-app.vercel.app/auth/discord/callback` to your Discord Application settings.

The project includes a `vercel.json` file that automatically configures the routing for the Express backend and Vite frontend.

- Node.js 18+
- A Google Gemini API Key (get it from [Google AI Studio](https://aistudio.google.com/))
- A Discord Application (for OAuth2 and Webhooks)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/zoot-archive.git
   cd zoot-archive
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your configuration:
   ```env
   # Gemini AI
   GEMINI_API_KEY=your_gemini_api_key

   # Discord Webhook for Submissions
   VITE_SUBMISSION_WEBHOOK_URL=your_discord_webhook_url

   # Discord OAuth2 (for member verification)
   VITE_DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_CLIENT_SECRET=your_discord_client_secret
   VITE_DISCORD_GUILD_ID=your_discord_server_id
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, TypeScript
- **Backend**: Express (for OAuth2 proxying)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **AI**: Google Generative AI (Gemini 3.1 Flash/Pro)
- **Icons**: Lucide React

## 📂 Project Structure

- `/src/components`: UI components and the main Translation Interface.
- `/src/lib`: Core logic for script parsing and AI integration.
- `/server.ts`: Express server handling Discord OAuth2 and asset proxying.
- `/src/types.ts`: Strict TypeScript definitions for story structures.

## 📜 Credits & Acknowledgments

This project relies on data and assets provided by the amazing Arknights community:

- **[ArknightsGameData](https://github.com/Kengxxiao/ArknightsGameData)** by Kengxxiao: The primary source for CN game data.
- **[ArknightsGameData_YoStar](https://github.com/Kengxxiao/ArknightsGameData_YoStar)** by Kengxxiao: Source for Global (EN/JP/KR) game data.
- **[PRTS.wiki](https://prts.wiki/)**: For story illustrations, character icons, and background assets.
- **[Arknights-Story-Text-Reader](https://github.com/0x0001/Arknights-Story-Text-Reader)**: Inspiration for script parsing logic.

## 🤝 Contributing

Contributions are welcome! If you have ideas for better parsing logic or UI improvements, feel free to open an issue or submit a pull request.

## 📜 License

This project is licensed under the MIT License.

---

*Disclaimer: This tool is a fan project and is not affiliated with Hypergryph or Yostar.*
