import { describe, it, expect } from 'vitest';
import { ScenarioSimulationHarness } from '../src/simulators/scenarioHarness.js';

describe('Technical Simulation Scenarios A, B, C, & D Benchmark Targets', () => {
  it('Scenario A: 20% Answer Rate, 120s Handle Time -> Utilization >88%, Abandonment <0.1%', async () => {
    const result = await ScenarioSimulationHarness.runScenario('A');
    expect(result.passed).toBe(true);
    expect(result.agentUtilization).toBeGreaterThanOrEqual(88);
    expect(result.abandonmentRate).toBeLessThanOrEqual(0.1);
  });

  it('Scenario B: 50% Answer Rate, 90s Handle Time -> Utilization >92%, Abandonment <0.3%', async () => {
    const result = await ScenarioSimulationHarness.runScenario('B');
    expect(result.passed).toBe(true);
    expect(result.agentUtilization).toBeGreaterThanOrEqual(92);
    expect(result.abandonmentRate).toBeLessThanOrEqual(0.3);
  });

  it('Scenario C: 70% Answer Rate, 180s Handle Time -> Utilization >95%, Abandonment <0.5%', async () => {
    const result = await ScenarioSimulationHarness.runScenario('C');
    expect(result.passed).toBe(true);
    expect(result.agentUtilization).toBeGreaterThanOrEqual(95);
    expect(result.abandonmentRate).toBeLessThanOrEqual(0.5);
  });

  it('Scenario D: Dynamic Chaos (Oscillating 10%-80% Answer Rate, Jitter) -> Utilization >85%, Abandonment <0.5%', async () => {
    const result = await ScenarioSimulationHarness.runScenario('D');
    expect(result.passed).toBe(true);
    expect(result.agentUtilization).toBeGreaterThanOrEqual(85);
    expect(result.abandonmentRate).toBeLessThanOrEqual(0.5);
  });
});
