"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressiveDialer = void 0;
const store_1 = require("../db/store");
const agentStateMachine_1 = require("../state-machines/agentStateMachine");
const callStateMachine_1 = require("../state-machines/callStateMachine");
const timezone_1 = require("../utils/timezone");
class ProgressiveDialer {
    /**
     * Progressive Dialing Algorithm:
     * Rule: Outbound Calls <= Available Agents.
     * Atomically locks Agent & Borrower and initiates call.
     */
    static async executePacing(campaignId) {
        const agents = await store_1.dbStore.getAgents();
        const availableAgents = agents.filter(a => a.state === 'AVAILABLE');
        if (availableAgents.length === 0) {
            return [];
        }
        const callsInitiated = [];
        for (const agent of availableAgents) {
            // 1. Lock and reserve borrower
            const borrower = await store_1.dbStore.lockAndReserveBorrower();
            if (!borrower)
                break; // No more queued borrowers
            // 2. Verify legal dialing hours (8 AM - 9 PM borrower local time)
            if (!(0, timezone_1.isWithinLegalDialingHours)(borrower.timezone)) {
                // Reset borrower status and skip
                borrower.status = 'QUEUED';
                await store_1.dbStore.saveBorrower(borrower);
                continue;
            }
            // 3. Lock agent
            try {
                await agentStateMachine_1.AgentStateMachine.transition(agent.id, 'RESERVED');
            }
            catch (err) {
                // Agent was concurrently reserved by another worker! Skip.
                borrower.status = 'QUEUED';
                await store_1.dbStore.saveBorrower(borrower);
                continue;
            }
            // 4. Create Call Record
            const callId = `call-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            const idempotencyKey = `idempotency-${callId}`;
            const newCall = {
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
            await store_1.dbStore.saveCall(newCall);
            // 5. Transition call & agent to INITIATED / DIALING
            await callStateMachine_1.CallStateMachine.transition(callId, 'RESERVED');
            await callStateMachine_1.CallStateMachine.transition(callId, 'INITIATED');
            await agentStateMachine_1.AgentStateMachine.transition(agent.id, 'DIALING', callId);
            callsInitiated.push(newCall);
        }
        return callsInitiated;
    }
}
exports.ProgressiveDialer = ProgressiveDialer;
