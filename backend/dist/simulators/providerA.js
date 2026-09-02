"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderASimulator = void 0;
const callStateMachine_1 = require("../state-machines/callStateMachine");
const agentStateMachine_1 = require("../state-machines/agentStateMachine");
const circuitBreaker_1 = require("../fault-tolerance/circuitBreaker");
class ProviderASimulator {
    /**
     * High performance provider:
     * Latency: 100ms - 300ms
     * Call Failure Rate: < 2%
     * Strictly ordered events, zero duplicates
     */
    static async executeCall(call) {
        if (!circuitBreaker_1.providerACircuitBreaker.canExecute()) {
            throw new Error('Provider A Circuit Breaker OPEN');
        }
        const latency = Math.floor(Math.random() * 200) + 100; // 100-300ms
        await new Promise(res => setTimeout(res, latency));
        const isFailure = Math.random() < 0.02; // 2% failure
        if (isFailure) {
            circuitBreaker_1.providerACircuitBreaker.recordResult(false);
            await callStateMachine_1.CallStateMachine.transition(call.id, 'FAILED', undefined, 'Provider A: BUSY / NO ANSWER');
            if (call.agent_id) {
                await agentStateMachine_1.AgentStateMachine.transition(call.agent_id, 'WRAP_UP');
                await new Promise(res => setTimeout(res, 50));
                await agentStateMachine_1.AgentStateMachine.transition(call.agent_id, 'AVAILABLE', null);
            }
            return;
        }
        circuitBreaker_1.providerACircuitBreaker.recordResult(true);
        // Standard sequence: RINGING -> ANSWERED -> CONNECTED -> COMPLETED
        await callStateMachine_1.CallStateMachine.transition(call.id, 'RINGING');
        await new Promise(res => setTimeout(res, 50));
        await callStateMachine_1.CallStateMachine.transition(call.id, 'ANSWERED');
        if (call.agent_id) {
            await agentStateMachine_1.AgentStateMachine.transition(call.agent_id, 'CONNECTED', call.id);
        }
        await callStateMachine_1.CallStateMachine.transition(call.id, 'CONNECTED');
        // Simulate active call duration
        const callDuration = Math.floor(Math.random() * 200) + 100;
        await new Promise(res => setTimeout(res, callDuration));
        await callStateMachine_1.CallStateMachine.transition(call.id, 'COMPLETED');
        if (call.agent_id) {
            await agentStateMachine_1.AgentStateMachine.transition(call.agent_id, 'WRAP_UP');
            await new Promise(res => setTimeout(res, 50));
            await agentStateMachine_1.AgentStateMachine.transition(call.agent_id, 'AVAILABLE', null);
        }
    }
}
exports.ProviderASimulator = ProviderASimulator;
