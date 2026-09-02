import { dbStore } from '../db/store';
import { AgentStateMachine } from '../state-machines/agentStateMachine';
import { CallStateMachine } from '../state-machines/callStateMachine';

export class StaleStateSweeper {
  /**
   * Sweeper process (Dead Man's Switch / Cron) running every 5 seconds.
   * Scans calls stuck in INITIATED or RESERVED state with updated_at < NOW() - 10 SECONDS.
   * Re-syncs or marks call FAILED, borrower RETRY_QUEUED, agent AVAILABLE.
   */
  public static async runSweep(staleThresholdMs: number = 10000): Promise<{
    sweptCalls: number;
    recoveredAgents: number;
  }> {
    const now = Date.now();
    const calls = await dbStore.getCalls();
    
    let sweptCalls = 0;
    let recoveredAgents = 0;

    for (const call of calls) {
      if (call.state === 'INITIATED' || call.state === 'RESERVED') {
        const timeDiff = now - new Date(call.updated_at).getTime();
        
        if (timeDiff >= staleThresholdMs) {
          // Stale worker crash detected!
          sweptCalls++;
          
          // Mark call as FAILED
          await CallStateMachine.transition(
            call.id,
            'FAILED',
            undefined,
            'Worker crash detected: Stale State Sweeper timeout'
          );

          // Reset Borrower to RETRY_QUEUED
          const borrower = await dbStore.getBorrower(call.borrower_id);
          if (borrower) {
            borrower.status = 'RETRY_QUEUED';
            await dbStore.saveBorrower(borrower);
          }

          // Reset Agent back to AVAILABLE
          if (call.agent_id) {
            const agent = await dbStore.getAgent(call.agent_id);
            if (agent && (agent.state === 'RESERVED' || agent.state === 'DIALING')) {
              try {
                await AgentStateMachine.transition(agent.id, 'AVAILABLE', null);
                recoveredAgents++;
              } catch (e) {
                // Ignore if already recovered
              }
            }
          }
        }
      }
    }

    return { sweptCalls, recoveredAgents };
  }
}
