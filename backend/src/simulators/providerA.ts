import { Call } from '../types/index';
import { CallStateMachine } from '../state-machines/callStateMachine';
import { AgentStateMachine } from '../state-machines/agentStateMachine';
import { dbStore } from '../db/store';
import { providerACircuitBreaker } from '../fault-tolerance/circuitBreaker';

export class ProviderASimulator {
  /**
   * High performance provider:
   * Latency: 100ms - 300ms
   * Call Failure Rate: < 2%
   * Strictly ordered events, zero duplicates
   */
  public static async executeCall(call: Call): Promise<void> {
    if (!providerACircuitBreaker.canExecute()) {
      throw new Error('Provider A Circuit Breaker OPEN');
    }

    const latency = Math.floor(Math.random() * 200) + 100; // 100-300ms
    await new Promise(res => setTimeout(res, latency));

    const isFailure = Math.random() < 0.02; // 2% failure

    if (isFailure) {
      providerACircuitBreaker.recordResult(false);
      await CallStateMachine.transition(call.id, 'FAILED', undefined, 'Provider A: BUSY / NO ANSWER');
      
      if (call.agent_id) {
        await AgentStateMachine.transition(call.agent_id, 'WRAP_UP');
        await new Promise(res => setTimeout(res, 50));
        await AgentStateMachine.transition(call.agent_id, 'AVAILABLE', null);
      }
      return;
    }

    providerACircuitBreaker.recordResult(true);

    // Standard sequence: RINGING -> ANSWERED -> CONNECTED -> COMPLETED
    await CallStateMachine.transition(call.id, 'RINGING');
    await new Promise(res => setTimeout(res, 50));

    await CallStateMachine.transition(call.id, 'ANSWERED');
    
    if (call.agent_id) {
      await AgentStateMachine.transition(call.agent_id, 'CONNECTED', call.id);
    }
    
    await CallStateMachine.transition(call.id, 'CONNECTED');

    // Simulate active call duration
    const callDuration = Math.floor(Math.random() * 200) + 100;
    await new Promise(res => setTimeout(res, callDuration));

    await CallStateMachine.transition(call.id, 'COMPLETED');

    if (call.agent_id) {
      await AgentStateMachine.transition(call.agent_id, 'WRAP_UP');
      await new Promise(res => setTimeout(res, 50));
      await AgentStateMachine.transition(call.agent_id, 'AVAILABLE', null);
    }
  }
}
