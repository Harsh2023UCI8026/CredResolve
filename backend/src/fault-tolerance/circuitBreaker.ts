export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureWindow: { timestamp: number; success: boolean }[] = [];
  private stateChangeTime: number = Date.now();
  private windowSizeMs = 10000; // 10 seconds
  private failureThresholdRatio = 0.20; // 20% failure rate
  private resetTimeoutMs = 15000; // 15 seconds to try HALF_OPEN

  public getState(): CircuitState {
    const now = Date.now();
    if (this.state === 'OPEN' && now - this.stateChangeTime > this.resetTimeoutMs) {
      this.state = 'HALF_OPEN';
      this.stateChangeTime = now;
    }
    return this.state;
  }

  public recordResult(success: boolean) {
    const now = Date.now();
    this.failureWindow.push({ timestamp: now, success });
    this.cleanWindow(now);

    if (this.state === 'HALF_OPEN') {
      if (success) {
        this.state = 'CLOSED';
        this.stateChangeTime = now;
      } else {
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

  private cleanWindow(now: number) {
    this.failureWindow = this.failureWindow.filter(f => now - f.timestamp <= this.windowSizeMs);
  }

  public canExecute(): boolean {
    return this.getState() !== 'OPEN';
  }
}

export const providerACircuitBreaker = new CircuitBreaker();
export const providerBCircuitBreaker = new CircuitBreaker();
