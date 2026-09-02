import { dbStore } from '../db/store';
import { AgentStateMachine } from '../state-machines/agentStateMachine';
import { CallStateMachine } from '../state-machines/callStateMachine';
import { Call, Borrower } from '../types/index';
import { isWithinLegalDialingHours } from '../utils/timezone';

export class ProgressiveDialer {
  /**
   * Progressive Dialing Algorithm:
   * Rule: Outbound Calls <= Available Agents.
   * Atomically locks Agent & Borrower and initiates call.
   */
  public static async executePacing(campaignId: string): Promise<Call[]> {
    const agents = await dbStore.getAgents();
    const availableAgents = agents.filter(a => a.state === 'AVAILABLE');
    
    if (availableAgents.length === 0) {
      return [];
    }

    const callsInitiated: Call[] = [];

    for (const agent of availableAgents) {
      // 1. Lock and reserve borrower
      const borrower = await dbStore.lockAndReserveBorrower();
      if (!borrower) break; // No more queued borrowers

      // 2. Verify legal dialing hours (8 AM - 9 PM borrower local time)
      if (!isWithinLegalDialingHours(borrower.timezone)) {
        // Reset borrower status and skip
        borrower.status = 'QUEUED';
        await dbStore.saveBorrower(borrower);
        continue;
      }

      // 3. Lock agent
      try {
        await AgentStateMachine.transition(agent.id, 'RESERVED');
      } catch (err) {
        // Agent was concurrently reserved by another worker! Skip.
        borrower.status = 'QUEUED';
        await dbStore.saveBorrower(borrower);
        continue;
      }

      // 4. Create Call Record
      const callId = `call-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const idempotencyKey = `idempotency-${callId}`;

      const newCall: Call = {
        id: callId,
        campaign_id: campaignId,
        borrower_id: borrower.id,
        agent_id: agent.id,
        state: 'QUEUED',
        provider_id: 'PROVIDER_A',
        idempotency_key: idempotencyKey,
        state_rank: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      await dbStore.saveCall(newCall);

      // 5. Transition call & agent to INITIATED / DIALING
      await CallStateMachine.transition(callId, 'RESERVED');
      await CallStateMachine.transition(callId, 'INITIATED');
      await AgentStateMachine.transition(agent.id, 'DIALING', callId);

      callsInitiated.push(newCall);
    }

    return callsInitiated;
  }
}
