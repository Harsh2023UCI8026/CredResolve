// System Type Definitions for SmartDialer

export type AgentState = 
  | 'OFFLINE'
  | 'AVAILABLE'
  | 'RESERVED'
  | 'DIALING'
  | 'CONNECTED'
  | 'WRAP_UP'
  | 'PAUSED';

export type CallState = 
  | 'QUEUED'
  | 'RESERVED'
  | 'INITIATED'
  | 'RINGING'
  | 'ANSWERED'
  | 'CONNECTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type BorrowerStatus = 
  | 'QUEUED'
  | 'IN_CALL'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRY_QUEUED';

export type CampaignType = 'PROGRESSIVE' | 'PREDICTIVE';
export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export interface Agent {
  id: string;
  name: string;
  state: AgentState;
  assigned_call_id: string | null;
  version: number;
  geo_lat: number;
  geo_lng: number;
  timezone: string;
  updated_at: Date;
  created_at: Date;
}

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  pacing_ratio: number;
  status: CampaignStatus;
  created_at: Date;
}

export interface Borrower {
  id: string;
  name: string;
  phone: string;
  status: BorrowerStatus;
  timezone: string;
  geo_lat: number;
  geo_lng: number;
  priority: number;
  updated_at: Date;
  created_at: Date;
}

export interface Call {
  id: string;
  campaign_id: string;
  borrower_id: string;
  agent_id: string | null;
  state: CallState;
  provider_id: string;
  idempotency_key: string;
  state_rank: number;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export const CALL_STATE_RANKS: Record<CallState, number> = {
  QUEUED: 1,
  RESERVED: 2,
  INITIATED: 3,
  RINGING: 4,
  ANSWERED: 5,
  CONNECTED: 6,
  COMPLETED: 7,
  FAILED: 7,
  CANCELLED: 7
};

export const TERMINAL_CALL_STATES: CallState[] = ['COMPLETED', 'FAILED', 'CANCELLED'];
