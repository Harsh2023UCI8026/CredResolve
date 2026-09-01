import { describe, it, expect, beforeEach } from 'vitest';
import { dbStore } from '../src/db/store.js';
import { Agent } from '../src/types/index.js';

describe('Concurrency & Double-Reservation Prevention Tests', () => {
  beforeEach(() => {
    dbStore.seedDefaults();
  });

  it('should guarantee 0 double-bookings when 2 workers concurrently reserve 1 available agent', async () => {
    const singleAgent: Agent = {
      id: 'ag-solo',
      name: 'Solo Available Agent',
      state: 'AVAILABLE',
      assigned_call_id: null,
      version: 10,
      geo_lat: 37.77,
      geo_lng: -122.41,
      timezone: 'America/Los_Angeles',
      updated_at: new Date(),
      created_at: new Date()
    };
    await dbStore.saveAgent(singleAgent);

    // Simulate 2 parallel workers attempting to reserve the 1 available agent
    const worker1Promise = dbStore.lockAndReserveAvailableAgents(1);
    const worker2Promise = dbStore.lockAndReserveAvailableAgents(1);

    const [w1Result, w2Result] = await Promise.all([worker1Promise, worker2Promise]);

    const totalReserved = w1Result.length + w2Result.length;
    
    // Exactly ONE worker must succeed, and total reserved MUST be 1
    expect(totalReserved).toBe(1);
  });
});
