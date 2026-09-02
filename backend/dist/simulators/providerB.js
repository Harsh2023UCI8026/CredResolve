"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderBSimulator = void 0;
const callStateMachine_1 = require("../state-machines/callStateMachine");
const agentStateMachine_1 = require("../state-machines/agentStateMachine");
const circuitBreaker_1 = require("../fault-tolerance/circuitBreaker");
class ProviderBSimulator {
    /**
     * Provider B (Chaotic Network Simulation):
     * Latency: 500ms - 4000ms with long-tail jitter
     * Failure Rate: 15% (BUSY, NO_ANSWER, NETWORK_CONGESTION)
     * Duplicate webhooks (10% probability)
     * Out-of-order delivery (15% probability e.g., COMPLETED before ANSWERED)
     * Dropped Webhooks / Timeouts (5% probability)
     */
    static async executeCall(call) {
        if (!circuitBreaker_1.providerBCircuitBreaker.canExecute()) {
            throw new Error('Provider B Circuit Breaker OPEN');
        }
        const latency = Math.floor(Math.random() * 3500) + 500; // 500-4000ms
        await new Promise(res => setTimeout(res, latency));
        // 5% Dropped Webhook / Timeout simulation
        if (Math.random() < 0.05) {
            circuitBreaker_1.providerBCircuitBreaker.recordResult(false);
            // Timeout occurs, sweeper will clean up later
            return;
        }
        // 15% Failure simulation
        if (Math.random() < 0.15) {
            circuitBreaker_1.providerBCircuitBreaker.recordResult(false);
            const errors = ['BUSY', 'NO_ANSWER', 'NETWORK_CONGESTION'];
            const err = errors[Math.floor(Math.random() * errors.length)];
            await callStateMachine_1.CallStateMachine.transition(call.id, 'FAILED', `hash-fail-${call.id}`, `Provider B Chaos: ${err}`);
            if (call.agent_id) {
                await agentStateMachine_1.AgentStateMachine.transition(call.agent_id, 'WRAP_UP');
                await new Promise(res => setTimeout(res, 50));
                await agentStateMachine_1.AgentStateMachine.transition(call.agent_id, 'AVAILABLE', null);
            }
            return;
        }
        circuitBreaker_1.providerBCircuitBreaker.recordResult(true);
        // 15% Out-Of-Order Event Delivery simulation
        const isOutOfOrder = Math.random() < 0.15;
        if (isOutOfOrder) {
            // Sends COMPLETED before ANSWERED!
            const duplicateHash = `hash-ooo-${call.id}`;
            // Direct jump to COMPLETED
            await callStateMachine_1.CallStateMachine.transition(call.id, 'COMPLETED', duplicateHash);
            // Subsequent delayed ANSWERED event should be rejected by state machine / rank check
            await callStateMachine_1.CallStateMachine.transition(call.id, 'ANSWERED', `delayed-hash-${call.id}`);
            if (call.agent_id) {
                await agentStateMachine_1.AgentStateMachine.transition(call.agent_id, 'WRAP_UP');
                await new Promise(res => setTimeout(res, 50));
                await agentStateMachine_1.AgentStateMachine.transition(call.agent_id, 'AVAILABLE', null);
            }
            return;
        }
        // Standard sequence with 10% Duplicate Webhook simulation
        const baseHash = `hash-std-${call.id}`;
        await callStateMachine_1.CallStateMachine.transition(call.id, 'RINGING', `${baseHash}-ring`);
        await new Promise(res => setTimeout(res, 50));
        // Simulate 10% duplicate webhook
        if (Math.random() < 0.10) {
            await callStateMachine_1.CallStateMachine.transition(call.id, 'RINGING', `${baseHash}-ring`);
        }
        await callStateMachine_1.CallStateMachine.transition(call.id, 'ANSWERED', `${baseHash}-ans`);
        if (call.agent_id) {
            await agentStateMachine_1.AgentStateMachine.transition(call.agent_id, 'CONNECTED', call.id);
        }
        await callStateMachine_1.CallStateMachine.transition(call.id, 'CONNECTED', `${baseHash}-conn`);
        await new Promise(res => setTimeout(res, 100));
        await callStateMachine_1.CallStateMachine.transition(call.id, 'COMPLETED', `${baseHash}-comp`);
        if (call.agent_id) {
            await agentStateMachine_1.AgentStateMachine.transition(call.agent_id, 'WRAP_UP');
            await new Promise(res => setTimeout(res, 50));
            await agentStateMachine_1.AgentStateMachine.transition(call.agent_id, 'AVAILABLE', null);
        }
    }
}
exports.ProviderBSimulator = ProviderBSimulator;
