"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaleStateSweeper = void 0;
const store_1 = require("../db/store");
const agentStateMachine_1 = require("../state-machines/agentStateMachine");
const callStateMachine_1 = require("../state-machines/callStateMachine");
class StaleStateSweeper {
    /**
     * Sweeper process (Dead Man's Switch / Cron) running every 5 seconds.
     * Scans calls stuck in INITIATED or RESERVED state with updated_at < NOW() - 10 SECONDS.
     * Re-syncs or marks call FAILED, borrower RETRY_QUEUED, agent AVAILABLE.
     */
    static async runSweep(staleThresholdMs = 10000) {
        const now = Date.now();
        const calls = await store_1.dbStore.getCalls();
        let sweptCalls = 0;
        let recoveredAgents = 0;
        for (const call of calls) {
            if (call.state === 'INITIATED' || call.state === 'RESERVED') {
                const timeDiff = now - new Date(call.updated_at).getTime();
                if (timeDiff >= staleThresholdMs) {
                    // Stale worker crash detected!
                    sweptCalls++;
                    // Mark call as FAILED
                    await callStateMachine_1.CallStateMachine.transition(call.id, 'FAILED', undefined, 'Worker crash detected: Stale State Sweeper timeout');
                    // Reset Borrower to RETRY_QUEUED
                    const borrower = await store_1.dbStore.getBorrower(call.borrower_id);
                    if (borrower) {
                        borrower.status = 'RETRY_QUEUED';
                        await store_1.dbStore.saveBorrower(borrower);
                    }
                    // Reset Agent back to AVAILABLE
                    if (call.agent_id) {
                        const agent = await store_1.dbStore.getAgent(call.agent_id);
                        if (agent && (agent.state === 'RESERVED' || agent.state === 'DIALING')) {
                            try {
                                await agentStateMachine_1.AgentStateMachine.transition(agent.id, 'AVAILABLE', null);
                                recoveredAgents++;
                            }
                            catch (e) {
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
exports.StaleStateSweeper = StaleStateSweeper;
