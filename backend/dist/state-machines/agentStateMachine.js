"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentStateMachine = exports.AgentStateMachineError = void 0;
const store_1 = require("../db/store");
class AgentStateMachineError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AgentStateMachineError';
    }
}
exports.AgentStateMachineError = AgentStateMachineError;
const VALID_AGENT_TRANSITIONS = {
    OFFLINE: ['AVAILABLE'],
    AVAILABLE: ['RESERVED', 'OFFLINE', 'PAUSED'],
    RESERVED: ['DIALING', 'AVAILABLE', 'OFFLINE'],
    DIALING: ['CONNECTED', 'WRAP_UP', 'AVAILABLE'],
    CONNECTED: ['WRAP_UP'],
    WRAP_UP: ['AVAILABLE', 'PAUSED', 'OFFLINE'],
    PAUSED: ['AVAILABLE', 'OFFLINE']
};
class AgentStateMachine {
    /**
     * Transition agent state with strict DAG validation and atomic DB transaction.
     * Throws FATAL AgentStateMachineError if transition is illegal.
     */
    static async transition(agentId, nextState, assignedCallId = null) {
        const agent = await store_1.dbStore.getAgent(agentId);
        if (!agent) {
            throw new AgentStateMachineError(`Agent ${agentId} not found`);
        }
        const currentState = agent.state;
        if (currentState === nextState) {
            return agent; // No-op idempotent transition
        }
        const allowedNext = VALID_AGENT_TRANSITIONS[currentState];
        if (!allowedNext || !allowedNext.includes(nextState)) {
            throw new AgentStateMachineError(`FATAL STATE ERROR: Invalid Agent transition from ${currentState} to ${nextState} for Agent ${agentId}`);
        }
        // Perform optimistic version update
        const success = await store_1.dbStore.updateAgentStateOptimistic(agentId, nextState, agent.version, assignedCallId);
        if (!success) {
            throw new AgentStateMachineError(`CONCURRENCY ERROR: Version mismatch while transitioning Agent ${agentId} from ${currentState} to ${nextState}`);
        }
        const updated = await store_1.dbStore.getAgent(agentId);
        return updated;
    }
}
exports.AgentStateMachine = AgentStateMachine;
