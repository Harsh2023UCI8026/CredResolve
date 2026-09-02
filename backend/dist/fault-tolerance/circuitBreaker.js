"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerBCircuitBreaker = exports.providerACircuitBreaker = exports.CircuitBreaker = void 0;
class CircuitBreaker {
    state = 'CLOSED';
    failureWindow = [];
    stateChangeTime = Date.now();
    windowSizeMs = 10000; // 10 seconds
    failureThresholdRatio = 0.20; // 20% failure rate
    resetTimeoutMs = 15000; // 15 seconds to try HALF_OPEN
    getState() {
        const now = Date.now();
        if (this.state === 'OPEN' && now - this.stateChangeTime > this.resetTimeoutMs) {
            this.state = 'HALF_OPEN';
            this.stateChangeTime = now;
        }
        return this.state;
    }
    recordResult(success) {
        const now = Date.now();
        this.failureWindow.push({ timestamp: now, success });
        this.cleanWindow(now);
        if (this.state === 'HALF_OPEN') {
            if (success) {
                this.state = 'CLOSED';
                this.stateChangeTime = now;
            }
            else {
                this.state = 'OPEN';
                this.stateChangeTime = now;
            }
            return;
        }
        if (this.failureWindow.length >= 5) {
            const failures = this.failureWindow.filter(f => !f.success).length;
            const failureRate = failures / this.failureWindow.length;
            if (failureRate > this.failureThresholdRatio) {
                this.state = 'OPEN';
                this.stateChangeTime = now;
            }
        }
    }
    cleanWindow(now) {
        this.failureWindow = this.failureWindow.filter(f => now - f.timestamp <= this.windowSizeMs);
    }
    canExecute() {
        return this.getState() !== 'OPEN';
    }
}
exports.CircuitBreaker = CircuitBreaker;
exports.providerACircuitBreaker = new CircuitBreaker();
exports.providerBCircuitBreaker = new CircuitBreaker();
