import { dbStore } from '../db/store';

export interface PacingInput {
  availableAgents: number;
  wrapUpAgents: number;
  meanWrapUpTime: number; // T_wrap in seconds (e.g. 10s)
  meanSetupTime: number;  // T_setup in seconds (e.g. 3s)
  answerRate: number;     // p_ans (0 < p_ans <= 1)
  inflightCalls: number;  // C_inflight (INITIATED or RINGING)
}

export class PredictiveEngine {
  /**
   * Predictive Pacing Algorithm (Poisson-Erlang Pipeline Model)
   * Formula:
   * A_total_hat = A_avail + (A_wrap * (T_setup / T_wrap))
   * N_pacing = max(0, floor(A_total_hat / p_ans) - C_inflight)
   */
  public static calculateTargetCalls(input: PacingInput): {
    targetCalls: number;
    expectedAvailability: number;
    suggestionMessage: string;
  } {
    const {
      availableAgents,
      wrapUpAgents,
      meanWrapUpTime,
      meanSetupTime,
      answerRate,
      inflightCalls
    } = input;

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
  public static async calculateCurrentPacing(
    answerRate: number = 0.5,
    meanWrapUpTime: number = 10,
    meanSetupTime: number = 3
  ) {
    const agents = await dbStore.getAgents();
    const calls = await dbStore.getCalls();

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
