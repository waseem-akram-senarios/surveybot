-- Add configuration columns to templates table for survey limits and settings
ALTER TABLE templates ADD COLUMN IF NOT EXISTS max_duration_seconds INTEGER DEFAULT 480;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS max_questions INTEGER;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS greeting_text TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS restricted_topics TEXT[];
ALTER TABLE templates ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- Add channel column to surveys if not exists
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'phone';

-- Add campaign support
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS campaign_id TEXT;

-- Create campaigns table if not exists
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    template_name TEXT REFERENCES templates(name),
    tenant_id TEXT,
    status TEXT DEFAULT 'active',
    frequency TEXT DEFAULT 'daily',
    created_at TIMESTAMP DEFAULT NOW(),
    config JSONB DEFAULT '{}'
);

-- Create call_transcripts table if not exists
CREATE TABLE IF NOT EXISTS call_transcripts (
    id TEXT PRIMARY KEY,
    survey_id TEXT REFERENCES surveys(id),
    full_transcript TEXT,
    call_duration_seconds INTEGER,
    call_started_at TIMESTAMP,
    call_ended_at TIMESTAMP,
    call_status TEXT,
    call_attempts INTEGER DEFAULT 1,
    channel TEXT DEFAULT 'phone'
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_surveys_campaign_id ON surveys(campaign_id);
CREATE INDEX IF NOT EXISTS idx_surveys_tenant_id ON surveys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_id ON campaigns(tenant_id);
