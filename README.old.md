# Decision Clarity - AI Decision Assistant

A simple web app that helps users think through difficult decisions using Claude AI.

## Setup Instructions

### 1. Install Dependencies

First, make sure you have Node.js installed. Then run:

```bash
npm install
```

### 2. Configure Your API Key

Your Claude API key is already configured in `server.js`. If you need to change it:
- Open `server.js`
- Find line 10 and replace with your API key:
  ```javascript
  const CLAUDE_API_KEY = 'your-api-key-here';
  ```

### 3. Start the Server

Run the server:

```bash
npm start
```

You should see:
```
🚀 Server running at http://localhost:3000
📝 Open http://localhost:3000 in your browser
```

### 4. Use the App

- Open your browser and go to `http://localhost:3000`
- Start chatting about any decision you're facing!

## How It Works

The app uses a **Node.js backend** to avoid CORS issues:

1. **Frontend** ([script.js](script.js)) - User interface that sends messages to your local server
2. **Backend** ([server.js](server.js)) - Node.js/Express server that calls the Claude API and returns responses
3. **Claude AI** - Acts as a thoughtful decision-making coach that:
   - Asks personalized follow-up questions
   - Helps uncover your values and constraints
   - Guides you toward clarity through conversation
   - Avoids generic advice in favor of understanding your unique situation

## Architecture

```
Browser (Frontend)  →  Local Server (Backend)  →  Claude API
    ↑                         ↓
    └─────────────────────────┘
```

This architecture:
- ✅ Avoids CORS issues
- ✅ Keeps your API key secure (not exposed in browser)
- ✅ Allows you to add rate limiting, logging, etc.

## Files

- `index.html` - Main HTML structure
- `styles.css` - Styling and animations
- `script.js` - Frontend chat functionality
- `server.js` - Backend Express server that calls Claude API
- `package.json` - Node.js dependencies
- `config.js` - (Not used anymore - API key is now in server.js)

## Development

For auto-restart on file changes:

```bash
npm run dev
```

## Security Notes

- Never commit your API key to version control
- The API key is now safely stored on the server side
- For production, use environment variables instead of hardcoding the key
