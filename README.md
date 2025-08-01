# Speech-to-Text Frontend

A modern React application for converting audio files to text with a beautiful, responsive interface.

## Features

- 🎵 **Audio Upload**: Drag and drop or click to upload audio files
- 🔄 **Real-time Transcription**: Convert audio to text using Deepgram API
- 📚 **Transcription History**: View, load, and manage previous transcriptions
- 📋 **Copy & Download**: Easy export options for transcribed text
- 📱 **Responsive Design**: Works perfectly on desktop and mobile devices
- 🎨 **Modern UI**: Beautiful interface built with Tailwind CSS

## Tech Stack

- **Framework**: React 18
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast
- **Build Tool**: Create React App

## Supported Audio Formats

- MP3
- WAV
- M4A
- FLAC
- OGG
- WEBM

**Maximum file size**: 1GB

## Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_API_URL=http://localhost:3001
```

For production, set this to your deployed backend URL.

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd speech-to-text-frontend
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your backend API URL
```

4. Start the development server:

```bash
npm start
```

The app will open at `http://localhost:3000`.

## Production Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Netlify

1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Configure environment variables

### GitHub Pages

1. Add `homepage` field to package.json
2. Install gh-pages: `npm install --save-dev gh-pages`
3. Add deploy scripts to package.json
4. Run `npm run deploy`

## API Integration

The frontend communicates with the backend API for:

- Audio transcription (`POST /api/speech/transcribe/web`)
- Fetching transcription history (`GET /api/transcriptions`)
- Managing transcriptions (CRUD operations)

Make sure your backend API is running and accessible at the URL specified in `REACT_APP_API_URL`.

## Project Structure

```
src/
├── components/          # Reusable components
├── pages/              # Page components
│   └── Home.js         # Main application page
├── App.js              # Root component
├── index.js            # Entry point
└── index.css           # Global styles
```

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## License

MIT
