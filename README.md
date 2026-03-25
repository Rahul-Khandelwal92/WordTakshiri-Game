# Swar-Takshari 🎤✨

The Definitive Bollywood Singing Arena. A React-based Antakshari-style game using Bollywood words.

## Problem Statement

Traditional Antakshari is a beloved party game, but it relies entirely on memory and quick thinking, which can be intimidating for some players. Furthermore, non-native speakers or those less familiar with Bollywood music might struggle to recall songs or pronounce specific Hindi/Urdu words correctly. 

**Swar-Takshari** bridges this gap by providing a digital, gamified arena. It prompts players with specific Bollywood words (complete with English meanings and emojis), challenges them with a countdown timer, and offers AI-powered pronunciation to help users learn. If a player gets stuck, the app reveals song hints and lyrics, transforming a high-pressure memory game into an inclusive, educational, and highly entertaining musical experience.

## Features

- **🧠 AI-Powered Pronunciation**: Hear the correct Hindi pronunciation of Bollywood words instantly, powered by Google's Gemini 2.5 Flash TTS model.
- **🎲 Dynamic Word Selection**: Pick random words via a slot-machine-style shuffle animation, or filter the library by category (Love, Emotion, Nature, etc.) and starting letter.
- **⏱️ Pressure Cooker Timer**: Challenge yourself with an adjustable countdown timer (5s, 10s, 15s, or 30s) to sing a song containing the target word.
- **💡 Hints & Lyrics Reveal**: Get stuck? Reveal song hints, lyrics, and direct YouTube search links to learn new songs and keep the game moving.
- **🔥 Streak Tracking**: Gamify your experience! Keep singing without help to build your high score and maintain your winning streak.
- **🎵 Rich Audio Feedback**: Enjoy custom-synthesized game sounds, ticking timers, and victory/defeat tunes built directly with the Web Audio API.
- **🎨 Immersive Theming**: Switch between a bright, elegant 'Luminous' (Luxury) theme and a sleek 'Midnight' dark mode.

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **Icons**: Lucide React
- **AI Integration**: Google GenAI SDK (`@google/genai`) using `gemini-2.5-flash-preview-tts`
- **Audio**: Native Web Audio API for synthesized game sounds

## Getting Started

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables. You will need a Gemini API key.
   Create a `.env` file and add:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## How to Play

1. Select a Bollywood keyword to start.
2. You have a set duration (e.g., 15 seconds) to sing a song containing that word.
3. If you succeed, click "NAILED IT" to increase your streak.
4. If you don't know a song, click "NO IDEA" to reveal the lyrics and reset your streak.
5. Keep singing without help to build your high score!

## License

MIT
