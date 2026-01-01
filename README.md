# Clarified - AI-Powered Decision Making

A thoughtful decision-making assistant powered by Claude AI and built with Supabase for authentication and data persistence.

## Features

- **Deep Clarity**: Comprehensive decision analysis with AI-powered recommendations
- **Quick Clarity**: Fast insights for simple decisions
- **User Accounts**: Secure authentication with email/password
- **Decision History**: Track all your decisions across devices
- **Outcome Recording**: Document what you decided and how it turned out
- **What-If Scenarios**: Explore how recommendations change with different priorities
- **Guest Mode**: Try the app without creating an account

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: Anthropic Claude API (Haiku model)

## Quick Start

### 1. Prerequisites

- Node.js (v14 or higher)
- A Supabase account (free tier available)
- An Anthropic API key

### 2. Installation

```bash
# Install dependencies
npm install
```

### 3. Set Up Supabase

Follow the detailed instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

**Quick summary:**
1. Create a project at https://app.supabase.com/
2. Copy your Project URL and anon key
3. Run the SQL schema from `SUPABASE_SETUP.md` to create tables
4. Update your `.env` file with credentials

### 4. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Required variables:
```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
CLAUDE_API_KEY=sk-ant-api03-...
PORT=3000
NODE_ENV=development
```

### 5. Run the App

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Open http://localhost:3000 in your browser!

## Project Structure

```
clarity-app/
├── server.js                # Express server + API proxy
├── clarity.html             # Main SPA HTML
├── clarity.css              # All styles
├── clarity.js               # App logic + AI integration
├── supabase-client.js       # Supabase auth & database functions
├── whatif-scenarios.js      # Sensitivity analysis feature
├── package.json             # Dependencies
├── .env                     # Environment variables (DO NOT COMMIT)
├── .env.example             # Template for .env
├── .gitignore               # Git ignore rules
├── README.md                # This file
└── SUPABASE_SETUP.md        # Detailed Supabase setup guide
```

## Key Features Explained

### Authentication

- **Sign Up**: Users create accounts with email + password
- **Email Confirmation**: Supabase sends verification emails
- **Sign In**: Secure password-based login
- **Guest Mode**: Try the app without an account (data not saved)
- **Session Management**: Automatic session handling with JWT tokens

### Data Persistence

- **Supabase Database**: All decisions stored in PostgreSQL
- **Row Level Security**: Users can only see their own data
- **LocalStorage Fallback**: Graceful degradation if Supabase unavailable
- **Data Migration**: Automatic offer to sync localStorage data on first login

### Decision Flow

1. User inputs decision question and context
2. Claude AI analyzes and provides recommendation
3. Decision automatically saved to user's account
4. User can later record what they decided (outcome)
5. View all decisions in "Decisions" page

## API Usage & Costs

### Claude API

- **Model**: `claude-3-haiku-20240307` (fastest, cheapest)
- **Cost**: ~$0.25 per million input tokens, ~$1.25 per million output tokens
- **Typical Decision**: ~$0.01-0.03 per Deep Clarity analysis

### Supabase

- **Free Tier**: 500 MB database, 50,000 monthly active users
- **Bandwidth**: 2 GB included
- **Authentication**: Unlimited users on free tier

## Security

✅ **Implemented:**
- Environment variables for sensitive keys
- Row Level Security (RLS) in database
- HTTPS-only Supabase connections
- Password hashing (handled by Supabase)
- JWT-based session management

⚠️ **Production Checklist:**
- [ ] Set up custom SMTP for branded emails
- [ ] Configure CORS for production domain
- [ ] Add rate limiting to API endpoints
- [ ] Set up monitoring/logging (Sentry, LogRocket)
- [ ] Enable Supabase email templates customization
- [ ] Add password reset flow
- [ ] Implement email change functionality

## Deployment

### Option 1: Render (Recommended)

1. Push code to GitHub (ensure `.env` is in `.gitignore`)
2. Connect repository to Render
3. Set environment variables in Render dashboard
4. Deploy with:
   - Build Command: `npm install`
   - Start Command: `npm start`

### Option 2: Vercel/Netlify

Requires converting to serverless functions. See deployment guide.

### Option 3: VPS (DigitalOcean, AWS)

```bash
# On server
git clone <repo>
cd clarity-app
npm install --production
npm install -g pm2
pm2 start server.js
pm2 save
```

## Development

### Run in Development Mode

```bash
npm run dev
```

This uses `nodemon` to auto-restart the server on file changes.

### Database Migrations

When you need to modify the database schema:

1. Write SQL migration in Supabase SQL Editor
2. Test in development project
3. Apply to production project
4. Document in `SUPABASE_SETUP.md`

### Testing Authentication

```bash
# Test config endpoint
curl -X GET http://localhost:3000/api/config

# Check server health
curl http://localhost:3000/api/health
```

## Troubleshooting

### "JWT expired" or auth errors

- Check that `SUPABASE_ANON_KEY` is correct
- Verify Supabase project is active
- Clear browser localStorage and try again

### "Relation does not exist" errors

- Run the SQL schema from `SUPABASE_SETUP.md`
- Check table names match code (decisions, outcomes)
- Verify RLS policies are created

### Decisions not saving

- Check browser console for errors
- Verify user is logged in (not guest)
- Check Supabase dashboard → Table Editor → decisions

### Server won't start

- Ensure all environment variables are set
- Check `.env` file exists and has correct format
- Verify Node.js version: `node --version` (should be v14+)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for setup help
- Review browser console for error messages
- Check Supabase dashboard for database issues

## Roadmap

- [ ] Password reset via email
- [ ] Social auth (Google, GitHub)
- [ ] Decision sharing (shareable links)
- [ ] Decision templates
- [ ] Export to PDF/JSON
- [ ] Mobile app (React Native)
- [ ] Team/collaborative decisions
- [ ] Decision reminders/check-ins
- [ ] Analytics dashboard
- [ ] API for third-party integrations
