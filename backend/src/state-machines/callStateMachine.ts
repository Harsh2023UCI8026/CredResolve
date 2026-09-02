import { Call, CallState, CALL_STATE_RANKS, TERMINAL_CALL_STATES } from '../types/index';
import { dbStore } from '../db/store';

export class CallStateMachineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CallStateMachineError';
  }
}

export class CallStateMachine {
  /**
   * Processes call state transition obeying:
   * Rule 1: Dropping stale/duplicate events if incoming rank <= current rank.
   * Rule 2: Terminal states (COMPLETED, FAILED, CANCELLED) are immutable locks.
   * Rule 3: Auto-reconciliation of intermediate skipped states.
   */
  public static async transition(
    callId: string,
    targetState: CallState,
    eventHash?: string,
    errorMessage?: string
  ): Promise<{ call: Call | undefined; dropped: boolean; reason?: string }> {
    // Webhook Deduplication check
    if (eventHash && dbStore.isDuplicateEvent(eventHash)) {
      return { call: await dbStore.getCall(callId), dropped: true, reason: 'Duplicate Event Hash' };
    }

    const call = await dbStore.getCall(callId);
    if (!call) {
      throw new CallStateMachineError(`Call ${callId} does not exist`);
    }

    // Rule 2: Terminal state immutability lock
    if (TERMINAL_CALL_STATES.includes(call.state)) {
      return {
        call,
        dropped: true,
        reason: `Immutable Terminal State Lock (${call.state}) - cannot transition to ${targetState}`
      };
    }

    const currentRank = call.state_rank;
    const targetRank = CALL_STATE_RANKS[targetState];

    // Rule 1: Incoming rank <= current rank -> drop duplicate or out-of-order event
    if (targetRank <= currentRank && call.state !== targetState) {
      return {
        call,
        dropped: true,
        reason: `Out-of-order event: Target rank ${targetRank} (${targetState}) <= Current rank ${currentRank} (${call.state})`
      };
    }

    // Rule 3: Auto-reconciliation of missing intermediate events
    const updatedCall: Call = {
      ...call,
      state: targetState,
      state_rank: targetRank,
      error_message: errorMessage || call.error_message,
      updated_at: new Date()
    };

    await dbStore.saveCall(updatedCall);
    return { call: updatedCall, dropped: false };
  }
}
