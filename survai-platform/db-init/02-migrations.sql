-- Migration 001: Add new tables for microservices architecture

CREATE TABLE IF NOT EXISTS campaigns (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    template_name TEXT REFERENCES templates(name),
    frequency   TEXT DEFAULT 'once' CHECK (frequency IN ('once', 'daily', 'weekly', 'monthly')),
    status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    next_run_date TIMESTAMP,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS riders (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    phone           TEXT,
    email           TEXT,
    biodata         JSONB DEFAULT '{}',
    last_ride_date  TIMESTAMP,
    ride_count      INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_transcripts (
    id                      TEXT PRIMARY KEY,
    survey_id               TEXT REFERENCES surveys(id),
    full_transcript         TEXT,
    call_duration_seconds   INTEGER DEFAULT 0,
    call_started_at         TIMESTAMP,
    call_ended_at           TIMESTAMP,
    call_status             TEXT DEFAULT 'pending',
    call_attempts           INTEGER DEFAULT 1,
    channel                 TEXT DEFAULT 'phone'
);

CREATE TABLE IF NOT EXISTS survey_analytics (
    survey_id           TEXT PRIMARY KEY REFERENCES surveys(id),
    overall_sentiment   TEXT,
    quality_score       REAL,
    key_themes          JSONB DEFAULT '[]',
    summary             TEXT,
    nps_score           REAL,
    satisfaction_score  REAL,
    analyzed_at         TIMESTAMP DEFAULT NOW()
);

-- Add columns to existing tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'time_limit_minutes') THEN
        ALTER TABLE templates ADD COLUMN time_limit_minutes INTEGER DEFAULT 8;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'max_questions') THEN
        ALTER TABLE templates ADD COLUMN max_questions INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'frequency') THEN
        ALTER TABLE templates ADD COLUMN frequency TEXT DEFAULT 'once';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'greeting_template') THEN
        ALTER TABLE templates ADD COLUMN greeting_template TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'restricted_topics') THEN
        ALTER TABLE templates ADD COLUMN restricted_topics TEXT[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'survey_type') THEN
        ALTER TABLE templates ADD COLUMN survey_type TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surveys' AND column_name = 'campaign_id') THEN
        ALTER TABLE surveys ADD COLUMN campaign_id TEXT REFERENCES campaigns(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surveys' AND column_name = 'rider_id') THEN
        ALTER TABLE surveys ADD COLUMN rider_id TEXT REFERENCES riders(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surveys' AND column_name = 'channel') THEN
        ALTER TABLE surveys ADD COLUMN channel TEXT DEFAULT 'phone';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surveys' AND column_name = 'call_attempts') THEN
        ALTER TABLE surveys ADD COLUMN call_attempts INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'survey_response_items' AND column_name = 'responded_at') THEN
        ALTER TABLE survey_response_items ADD COLUMN responded_at TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'survey_response_items' AND column_name = 'channel') THEN
        ALTER TABLE survey_response_items ADD COLUMN channel TEXT DEFAULT 'phone';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'survey_response_items' AND column_name = 'confidence') THEN
        ALTER TABLE survey_response_items ADD COLUMN confidence REAL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'survey_response_items' AND column_name = 'sentiment') THEN
        ALTER TABLE survey_response_items ADD COLUMN sentiment TEXT;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_template ON campaigns(template_name);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_riders_phone ON riders(phone);
CREATE INDEX IF NOT EXISTS idx_riders_email ON riders(email);
CREATE INDEX IF NOT EXISTS idx_call_transcripts_survey ON call_transcripts(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_analytics_survey ON survey_analytics(survey_id);
CREATE INDEX IF NOT EXISTS idx_surveys_campaign ON surveys(campaign_id);
CREATE INDEX IF NOT EXISTS idx_surveys_rider ON surveys(rider_id);
CREATE INDEX IF NOT EXISTS idx_surveys_channel ON surveys(channel);

-- AI Augmented toggle support
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS ai_augmented boolean DEFAULT true;
