"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyController = void 0;
class SafetyController {
    static overdialRatioLimit = 1.3; // M_overdial
    static agentBuffer = 1; // A_buffer
    static maxAbandonmentRate = 0.005; // 0.5% (strict compliance limit)
    static maxProviderErrorRate = 0.05; // 5%
    static maxProviderLatency = 2500; // 2500ms
    static lastAgentCount = 0;
    static lastAgentCheckTime = Date.now();
    static freezeUntilTime = 0;
    static auditLogs = [];
    static getLogs() {
        return [...this.auditLogs];
    }
    /**
     * Evaluates Pacing Engine request against safety firewall rules.
     */
    static evaluateRequest(requestedCalls, availableAgents, inflightCalls, abandonmentRate, providerErrorRate, providerLatency) {
        const now = Date.now();
        // Rule 4: Agent Drop Shock Filter check
        if (this.lastAgentCount > 0 && availableAgents < this.lastAgentCount) {
            const timeDiffSec = (now - this.lastAgentCheckTime) / 1000;
            if (timeDiffSec <= 5) {
                const dropRatio = (this.lastAgentCount - availableAgents) / this.lastAgentCount;
                if (dropRatio >= 0.3) {
                    // 30% drop in < 5 seconds! Freeze predictive dials for 30s
                    this.freezeUntilTime = now + 30000;
                }
            }
        }
        this.lastAgentCount = availableAgents;
        this.lastAgentCheckTime = now;
        // Check freeze active state
        if (now < this.freezeUntilTime) {
            const log = {
                timestamp: new Date(),
                requestedCalls,
                approvedCalls: 0,
                mode: 'FROZEN',
                reason: 'Agent Drop Shock Filter Active (>30% agent loss detected in <5s)',
                abandonmentRate,
                providerErrorRate,
                providerLatency,
                agentDropDetected: true
            };
            this.auditLogs.unshift(log);
            if (this.auditLogs.length > 50)
                this.auditLogs.pop();
            return { approvedCalls: 0, mode: 'FROZEN', reason: log.reason };
        }
        // Rule 2: Abandonment Threshold Guard
        if (abandonmentRate >= this.maxAbandonmentRate) {
            const progressiveTarget = Math.max(0, availableAgents - inflightCalls);
            const log = {
                timestamp: new Date(),
                requestedCalls,
                approvedCalls: progressiveTarget,
                mode: 'PROGRESSIVE',
                reason: `Call Abandonment Rate (${(abandonmentRate * 100).toFixed(2)}%) exceeds safety limit (0.5%). Auto-downgraded to Progressive Mode.`,
                abandonmentRate,
                providerErrorRate,
                providerLatency,
                agentDropDetected: false
            };
            this.auditLogs.unshift(log);
            if (this.auditLogs.length > 50)
                this.auditLogs.pop();
            return { approvedCalls: progressiveTarget, mode: 'PROGRESSIVE', reason: log.reason };
        }
        // Rule 3: Provider Health Degraded Guard
        if (providerErrorRate > this.maxProviderErrorRate || providerLatency > this.maxProviderLatency) {
            const progressiveTarget = Math.max(0, availableAgents - inflightCalls);
            const log = {
                timestamp: new Date(),
                requestedCalls,
                approvedCalls: progressiveTarget,
                mode: 'PROGRESSIVE',
                reason: `Provider degraded (Error rate: ${(providerErrorRate * 100).toFixed(1)}%, Latency: ${providerLatency}ms). Auto-downgraded to Progressive Mode.`,
                abandonmentRate,
                providerErrorRate,
                providerLatency,
                agentDropDetected: false
            };
            this.auditLogs.unshift(log);
            if (this.auditLogs.length > 50)
                this.auditLogs.pop();
            return { approvedCalls: progressiveTarget, mode: 'PROGRESSIVE', reason: log.reason };
        }
        // Rule 1: Hard Ceiling Rule: N_approved <= min(N_pacing, A_avail * M_overdial + A_buffer)
        const hardCeiling = Math.floor(availableAgents * this.overdialRatioLimit + this.agentBuffer);
        const approvedCalls = Math.min(requestedCalls, hardCeiling);
        const log = {
            timestamp: new Date(),
            requestedCalls,
            approvedCalls,
            mode: 'PREDICTIVE',
            reason: `Passed Safety Firewall. Approved ${approvedCalls} calls (Hard ceiling limit: ${hardCeiling}).`,
            abandonmentRate,
            providerErrorRate,
            providerLatency,
            agentDropDetected: false
        };
        this.auditLogs.unshift(log);
        if (this.auditLogs.length > 50)
            this.auditLogs.pop();
        return { approvedCalls, mode: 'PREDICTIVE', reason: log.reason };
    }
}
exports.SafetyController = SafetyController;
