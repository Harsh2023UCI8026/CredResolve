"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictiveEngine = void 0;
const store_1 = require("../db/store");
class PredictiveEngine {
    /**
     * Predictive Pacing Algorithm (Poisson-Erlang Pipeline Model)
     * Formula:
     * A_total_hat = A_avail + (A_wrap * (T_setup / T_wrap))
     * N_pacing = max(0, floor(A_total_hat / p_ans) - C_inflight)
     */
    static calculateTargetCalls(input) {
        const { availableAgents, wrapUpAgents, meanWrapUpTime, meanSetupTime, answerRate, inflightCalls } = input;
        const validAnswerRate = Math.max(0.01, Math.min(1.0, answerRate));
        const validWrapUpTime = Math.max(1.0, meanWrapUpTime);
        // Expected total agents available at t + T_setup
        const expectedAvailability = availableAgents + (wrapUpAgents * (meanSetupTime / validWrapUpTime));
        // Raw predictive outbound dial request
        const rawCalls = Math.floor(expectedAvailability / validAnswerRate) - inflightCalls;
        const targetCalls = Math.max(0, rawCalls);
        return {
            targetCalls,
            expectedAvailability,
            suggestionMessage: `Requesting ${targetCalls} calls`
        };
    }
    /**
     * Collects current real-time metrics from DatabaseStore and calculates pacing
     */
    static async calculateCurrentPacing(answerRate = 0.5, meanWrapUpTime = 10, meanSetupTime = 3) {
        const agents = await store_1.dbStore.getAgents();
        const calls = await store_1.dbStore.getCalls();
        const availableAgents = agents.filter(a => a.state === 'AVAILABLE').length;
        const wrapUpAgents = agents.filter(a => a.state === 'WRAP_UP').length;
        const inflightCalls = calls.filter(c => c.state === 'INITIATED' || c.state === 'RINGING').length;
        return this.calculateTargetCalls({
            availableAgents,
            wrapUpAgents,
            meanWrapUpTime,
            meanSetupTime,
            answerRate,
            inflightCalls
        });
    }
}
exports.PredictiveEngine = PredictiveEngine;
