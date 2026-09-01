-- SmartDialer Database Schema Definition
-- PostgreSQL Schema with strict ACID guarantees & Indexing for Row Locking

CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    state VARCHAR(32) NOT NULL DEFAULT 'OFFLINE',
    assigned_call_id VARCHAR(64),
    version INT NOT NULL DEFAULT 1,
    geo_lat DOUBLE PRECISION NOT NULL DEFAULT 37.7749,
    geo_lng DOUBLE PRECISION NOT NULL DEFAULT -122.4194,
    timezone VARCHAR(64) NOT NULL DEFAULT 'America/Los_Angeles',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaigns (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'PREDICTIVE', -- 'PROGRESSIVE' or 'PREDICTIVE'
    pacing_ratio DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS borrowers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'QUEUED', -- QUEUED, IN_CALL, COMPLETED, FAILED, RETRY_QUEUED
    timezone VARCHAR(64) NOT NULL DEFAULT 'America/New_York',
    geo_lat DOUBLE PRECISION NOT NULL DEFAULT 40.7128,
    geo_lng DOUBLE PRECISION NOT NULL DEFAULT -74.0060,
    priority INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calls (
    id VARCHAR(64) PRIMARY KEY,
    campaign_id VARCHAR(64) NOT NULL REFERENCES campaigns(id),
    borrower_id VARCHAR(64) NOT NULL REFERENCES borrowers(id),
    agent_id VARCHAR(64) REFERENCES agents(id),
    state VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
    provider_id VARCHAR(64) DEFAULT 'PROVIDER_A',
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    state_rank INT NOT NULL DEFAULT 1,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Essential Performance & Concurrency Indexes
CREATE INDEX IF NOT EXISTS idx_agents_state_campaign ON agents(state);
CREATE INDEX IF NOT EXISTS idx_borrowers_status_priority ON borrowers(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_calls_state_updated ON calls(state, updated_at);
CREATE INDEX IF NOT EXISTS idx_calls_idempotency ON calls(idempotency_key);
