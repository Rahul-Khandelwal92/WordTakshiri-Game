# Swar-Takshari

The Definitive Bollywood Singing Arena. A React-based Antakshari-style game using Bollywood words.

## Features

- **Word Selection**: Pick random words or filter by category and starting letter.
- **Timer**: Challenge yourself with a timer for singing.
- **Hints & Lyrics**: Reveal song hints and lyrics if you get stuck.
- **Audio Feedback**: Enjoy game sounds and confetti for a fun experience.
- **Theming**: Switch between 'Luxury' and 'Midnight' themes.
- **AI Pronunciation**: Hear the correct pronunciation of the Bollywood words using Google's Gemini TTS model.

## Tech Stack

- React 19
- Vite
- Tailwind CSS
- Lucide React (Icons)
- Google GenAI SDK (`@google/genai`)

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
