import { Agent, AgentState } from '../types/index';
import { dbStore } from '../db/store';

export class AgentStateMachineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentStateMachineError';
  }
}

const VALID_AGENT_TRANSITIONS: Record<AgentState, AgentState[]> = {
  OFFLINE: ['AVAILABLE'],
  AVAILABLE: ['RESERVED', 'OFFLINE', 'PAUSED'],
  RESERVED: ['DIALING', 'AVAILABLE', 'OFFLINE'],
  DIALING: ['CONNECTED', 'WRAP_UP', 'AVAILABLE'],
  CONNECTED: ['WRAP_UP'],
  WRAP_UP: ['AVAILABLE', 'PAUSED', 'OFFLINE'],
  PAUSED: ['AVAILABLE', 'OFFLINE']
};

export class AgentStateMachine {
  /**
   * Transition agent state with strict DAG validation and atomic DB transaction.
   * Throws FATAL AgentStateMachineError if transition is illegal.
   */
  public static async transition(
    agentId: string,
    nextState: AgentState,
    assignedCallId: string | null = null
  ): Promise<Agent> {
    const agent = await dbStore.getAgent(agentId);
    if (!agent) {
      throw new AgentStateMachineError(`Agent ${agentId} not found`);
    }

    const currentState = agent.state;
    if (currentState === nextState) {
      return agent; // No-op idempotent transition
    }

    const allowedNext = VALID_AGENT_TRANSITIONS[currentState];
    if (!allowedNext || !allowedNext.includes(nextState)) {
      throw new AgentStateMachineError(
        `FATAL STATE ERROR: Invalid Agent transition from ${currentState} to ${nextState} for Agent ${agentId}`
      );
    }

    // Perform optimistic version update
    const success = await dbStore.updateAgentStateOptimistic(
      agentId,
      nextState,
      agent.version,
      assignedCallId
    );

    if (!success) {
      throw new AgentStateMachineError(
        `CONCURRENCY ERROR: Version mismatch while transitioning Agent ${agentId} from ${currentState} to ${nextState}`
      );
    }

    const updated = await dbStore.getAgent(agentId);
    return updated!;
  }
}
