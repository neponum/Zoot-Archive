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
