# Quick Start Guide

Get Clarified running with Supabase in 10 minutes!

## Step 1: Install Dependencies (1 minute)

```bash
cd clarity-app
npm install
```

## Step 2: Create Supabase Project (3 minutes)

1. Go to **https://app.supabase.com/**
2. Click **"New Project"**
3. Fill in:
   - Name: `clarity-app`
   - Database Password: (create a strong password)
   - Region: (choose closest to you)
4. Click **"Create new project"**
5. Wait ~2 minutes for provisioning

## Step 3: Get Your API Keys (1 minute)

1. In your new Supabase project, click **Settings** (gear icon in sidebar)
2. Click **API** in the left menu
3. Copy two values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** key (under "Project API keys"): `eyJhbGci...`

## Step 4: Configure Environment Variables (1 minute)

1. Open the `.env` file in your project root
2. Replace the placeholder values:

```env
# Replace these with your Supabase values from Step 3
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# This is already set (your Claude API key)
CLAUDE_API_KEY=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

PORT=3000
NODE_ENV=development
```

3. Save the file

## Step 5: Create Database Tables (2 minutes)

1. In Supabase dashboard, click **SQL Editor** in sidebar
2. Click **"New query"**
3. Open `SUPABASE_SETUP.md` in this project
4. Copy the entire SQL code block (starts with `CREATE EXTENSION...`)
5. Paste into the SQL Editor
6. Click **"Run"** (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned"

## Step 6: Start the App (30 seconds)

```bash
npm run dev
```

You should see:
```
🚀 Server running at http://localhost:3000
📝 Open http://localhost:3000 in your browser
```

## Step 7: Test It! (2 minutes)

1. Open **http://localhost:3000** in your browser
2. Click **"Sign up"**
3. Enter your email and password
4. Click **"Sign Up"**
5. Check your email for confirmation link
6. Click the confirmation link
7. Go back to http://localhost:3000
8. Click **"Sign in"**
9. Enter the same email/password
10. Make a decision!

## Verify It's Working

### Check Browser Console (F12)
You should see:
```
✅ Supabase initialized
✅ User already logged in: your@email.com
✅ Decision saved to Supabase: <uuid>
```

### Check Supabase Dashboard
1. Go to Supabase dashboard
2. Click **Table Editor** in sidebar
3. Select **decisions** table
4. You should see your saved decision!

## Troubleshooting

### "JWT expired" error
- Your `SUPABASE_ANON_KEY` is incorrect
- Double-check you copied the **anon** key (not the **service_role** key)

### "relation does not exist" error
- You didn't run the SQL schema
- Go back to Step 5 and run the SQL code

### "Cannot read property 'createClient'" error
- Supabase JS library didn't load
- Check your internet connection
- Make sure `clarity.html` has the Supabase CDN script tag

### Server won't start
- Make sure `.env` file exists and has valid values
- Check that all environment variables are set (no `your_xxx_here` placeholders)

### Can't sign up
- Check browser console for errors
- Verify Supabase project is active (not paused)
- Make sure you're online

## What's Next?

Now that it's working:

1. **Explore the app** - Try Deep Clarity and Quick Clarity
2. **Check your data** - View decisions in Supabase dashboard
3. **Read the docs** - See `README.md` for full documentation
4. **Deploy it** - See `README.md` for deployment options

## Quick Commands

```bash
# Start development server (auto-reload)
npm run dev

# Start production server
npm start

# Check if server is healthy
curl http://localhost:3000/api/health

# View Supabase config
curl http://localhost:3000/api/config
```

## Need Help?

- **Setup issues**: See `SUPABASE_SETUP.md`
- **General docs**: See `README.md`
- **Implementation details**: See `IMPLEMENTATION_SUMMARY.md`
- **Browser errors**: Open DevTools (F12) and check Console tab
- **Database errors**: Check Supabase dashboard → Logs

## Success! 🎉

If you can sign in and save a decision, you're all set! The app is now:
- ✅ Using Supabase for authentication
- ✅ Saving decisions to PostgreSQL database
- ✅ Syncing data across devices
- ✅ Ready for production deployment

Enjoy using Clarified!
