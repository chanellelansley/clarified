# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to https://app.supabase.com/
2. Click "New Project"
3. Enter project details:
   - Name: `clarity-app` (or your preferred name)
   - Database Password: (generate a strong password)
   - Region: Choose closest to your users
4. Click "Create new project"
5. Wait for project to be provisioned (~2 minutes)

## 2. Get API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **Project API Keys** → **anon/public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. Update your `.env` file with these values:
   ```
   SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## 3. Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the SQL below
4. Click "Run" or press Cmd/Ctrl + Enter

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Decisions table
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Decision details
    question TEXT NOT NULL,
    reframed_question TEXT,
    category TEXT,

    -- Decision inputs (stored as JSONB for flexibility)
    options JSONB DEFAULT '[]'::jsonb,
    values JSONB DEFAULT '[]'::jsonb,
    challenges JSONB DEFAULT '[]'::jsonb,
    assumptions JSONB DEFAULT '[]'::jsonb,

    -- Significance & timeline
    significance TEXT,
    timeline TEXT,

    -- AI recommendation data
    recommendation JSONB,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outcomes table
CREATE TABLE outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- What user decided
    choice_made TEXT NOT NULL,
    reflection TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_decisions_user_id ON decisions(user_id);
CREATE INDEX idx_decisions_created_at ON decisions(created_at DESC);
CREATE INDEX idx_outcomes_decision_id ON outcomes(decision_id);
CREATE INDEX idx_outcomes_user_id ON outcomes(user_id);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;

-- Decisions policies: Users can only see/edit their own decisions
CREATE POLICY "Users can view their own decisions"
    ON decisions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own decisions"
    ON decisions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own decisions"
    ON decisions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decisions"
    ON decisions FOR DELETE
    USING (auth.uid() = user_id);

-- Outcomes policies: Users can only see/edit their own outcomes
CREATE POLICY "Users can view their own outcomes"
    ON outcomes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outcomes"
    ON outcomes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outcomes"
    ON outcomes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outcomes"
    ON outcomes FOR DELETE
    USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_decisions_updated_at
    BEFORE UPDATE ON decisions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outcomes_updated_at
    BEFORE UPDATE ON outcomes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## 4. Configure Authentication

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Enable **Email** provider (should be enabled by default)
3. Optional: Configure email templates under **Authentication** → **Email Templates**

## 5. Test Connection

After updating your `.env` file with the correct values, restart your server:

```bash
npm run dev
```

The app will now connect to Supabase for authentication and data storage!

## 6. Optional: Configure Email Settings

For production, you'll want to configure custom SMTP settings:

1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Configure your email provider (SendGrid, Mailgun, etc.)
3. This allows you to send branded confirmation emails

## Troubleshooting

- **"relation does not exist" error**: Make sure you ran the SQL schema creation script
- **"JWT expired" error**: Check that your SUPABASE_ANON_KEY is correct
- **Can't insert data**: Verify Row Level Security policies are created
- **Connection refused**: Check that SUPABASE_URL is correct (should start with https://)
