import { describe, it, expect, beforeEach } from 'vitest';
import { dbStore } from '../src/db/store.js';
import { AgentStateMachine, AgentStateMachineError } from '../src/state-machines/agentStateMachine.js';
import { CallStateMachine } from '../src/state-machines/callStateMachine.js';
import { Agent, Call } from '../src/types/index.js';

describe('Agent State Machine DAG & Concurrency Tests', () => {
  beforeEach(() => {
    dbStore.seedDefaults();
  });

  it('should transition agent cleanly along valid DAG path', async () => {
    const agent: Agent = {
      id: 'ag-1',
      name: 'Test Agent',
      state: 'OFFLINE',
      assigned_call_id: null,
      version: 1,
      geo_lat: 37.77,
      geo_lng: -122.41,
      timezone: 'America/Los_Angeles',
      updated_at: new Date(),
      created_at: new Date()
    };
    await dbStore.saveAgent(agent);

    // OFFLINE -> AVAILABLE
    let updated = await AgentStateMachine.transition('ag-1', 'AVAILABLE');
    expect(updated.state).toBe('AVAILABLE');
    expect(updated.version).toBe(2);

    // AVAILABLE -> RESERVED
    updated = await AgentStateMachine.transition('ag-1', 'RESERVED');
    expect(updated.state).toBe('RESERVED');

    // RESERVED -> DIALING
    updated = await AgentStateMachine.transition('ag-1', 'DIALING', 'call-100');
    expect(updated.state).toBe('DIALING');
    expect(updated.assigned_call_id).toBe('call-100');
  });

  it('should throw FATAL error on invalid state transition (OFFLINE -> CONNECTED)', async () => {
    const agent: Agent = {
      id: 'ag-bad',
      name: 'Bad Agent',
      state: 'OFFLINE',
      assigned_call_id: null,
      version: 1,
      geo_lat: 37.77,
      geo_lng: -122.41,
      timezone: 'America/Los_Angeles',
      updated_at: new Date(),
      created_at: new Date()
    };
    await dbStore.saveAgent(agent);

    await expect(AgentStateMachine.transition('ag-bad', 'CONNECTED')).rejects.toThrow(
      AgentStateMachineError
    );
  });
});

describe('Call State Machine Rank & Deduplication Tests', () => {
  beforeEach(() => {
    dbStore.seedDefaults();
  });

  it('should reject out-of-order event with lower rank', async () => {
    const call: Call = {
      id: 'call-1',
      campaign_id: 'camp-1',
      borrower_id: 'b-1',
      agent_id: 'ag-1',
      state: 'CONNECTED',
      provider_id: 'PROVIDER_A',
      idempotency_key: 'idem-1',
      state_rank: 6,
      created_at: new Date(),
      updated_at: new Date()
    };
    await dbStore.saveCall(call);

    // Attempting delayed RINGING (rank 4) on CONNECTED (rank 6)
    const result = await CallStateMachine.transition('call-1', 'RINGING');
    expect(result.dropped).toBe(true);
    expect(result.reason).toContain('Out-of-order event');
  });

  it('should enforce terminal state immutability lock', async () => {
    const call: Call = {
      id: 'call-term',
      campaign_id: 'camp-1',
      borrower_id: 'b-1',
      agent_id: 'ag-1',
      state: 'COMPLETED',
      provider_id: 'PROVIDER_A',
      idempotency_key: 'idem-term',
      state_rank: 7,
      created_at: new Date(),
      updated_at: new Date()
    };
    await dbStore.saveCall(call);

    const result = await CallStateMachine.transition('call-term', 'CONNECTED');
    expect(result.dropped).toBe(true);
    expect(result.reason).toContain('Immutable Terminal State Lock');
  });
});
