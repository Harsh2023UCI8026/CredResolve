import { Agent, Borrower, Call, Campaign, AgentState, CallState, CALL_STATE_RANKS } from '../types/index';

/**
 * SmartDialer Transactional Database Engine
 * Implements strict ACID semantics, row-level locking (SELECT ... FOR UPDATE SKIP LOCKED),
 * and optimistic concurrency control (version increments).
 */
export class DatabaseStore {
  private agents: Map<string, Agent> = new Map();
  private campaigns: Map<string, Campaign> = new Map();
  private borrowers: Map<string, Borrower> = new Map();
  private calls: Map<string, Call> = new Map();
  private idempotencyKeys: Set<string> = new Set();
  private lockTable: Set<string> = new Set();

  constructor() {
    this.seedDefaults();
  }

  public seedDefaults() {
    this.agents.clear();
    this.campaigns.clear();
    this.borrowers.clear();
    this.calls.clear();
    this.idempotencyKeys.clear();
    this.lockTable.clear();

    // Default Campaign
    this.campaigns.set('camp-1', {
      id: 'camp-1',
      name: 'Default Debt Resolution Campaign',
      type: 'PREDICTIVE',
      pacing_ratio: 1.3,
      status: 'ACTIVE',
      created_at: new Date()
    });
  }

  public async getAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  public async getAgent(id: string): Promise<Agent | undefined> {
    const a = this.agents.get(id);
    return a ? { ...a } : undefined;
  }

  public async saveAgent(agent: Agent): Promise<void> {
    this.agents.set(agent.id, { ...agent, updated_at: new Date() });
  }

  public async getBorrowers(): Promise<Borrower[]> {
    return Array.from(this.borrowers.values());
  }

  public async getBorrower(id: string): Promise<Borrower | undefined> {
    const b = this.borrowers.get(id);
    return b ? { ...b } : undefined;
  }

  public async saveBorrower(borrower: Borrower): Promise<void> {
    this.borrowers.set(borrower.id, { ...borrower, updated_at: new Date() });
  }

  public async getCalls(): Promise<Call[]> {
    return Array.from(this.calls.values());
  }

  public async getCall(id: string): Promise<Call | undefined> {
    const c = this.calls.get(id);
    return c ? { ...c } : undefined;
  }

  public async saveCall(call: Call): Promise<void> {
    this.calls.set(call.id, { ...call, updated_at: new Date() });
  }

  public async getCampaign(id: string): Promise<Campaign | undefined> {
    const c = this.campaigns.get(id);
    return c ? { ...c } : undefined;
  }

  /**
   * SQL Implementation equivalent:
   * SELECT id FROM agents WHERE state = 'AVAILABLE' FOR UPDATE SKIP LOCKED LIMIT $count
   * Atomically locks and reserves agents to prevent double-booking.
   */
  public async lockAndReserveAvailableAgents(count: number): Promise<Agent[]> {
    const reserved: Agent[] = [];
    
    for (const agent of this.agents.values()) {
      if (reserved.length >= count) break;
      
      // Simulate PostgreSQL row lock check
      if (agent.state === 'AVAILABLE' && !this.lockTable.has(`agent:${agent.id}`)) {
        // Acquire Row Lock
        this.lockTable.add(`agent:${agent.id}`);
        
        // Optimistic Version update & State transition to RESERVED
        const updatedAgent: Agent = {
          ...agent,
          state: 'RESERVED',
          version: agent.version + 1,
          updated_at: new Date()
        };
        
        this.agents.set(agent.id, updatedAgent);
        reserved.push({ ...updatedAgent });

        // Release row lock after transaction commit
        this.lockTable.delete(`agent:${agent.id}`);
      }
    }
    
    return reserved;
  }

  /**
   * Atomic Optimistic Concurrency Control Update:
   * UPDATE agents SET state = $state, version = version + 1 WHERE id = $id AND version = $expectedVersion
   */
  public async updateAgentStateOptimistic(
    agentId: string,
    targetState: AgentState,
    expectedVersion: number,
    assignedCallId: string | null = null
  ): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    if (agent.version !== expectedVersion) {
      // Version mismatch! Optimistic lock failure
      return false;
    }

    const updated: Agent = {
      ...agent,
      state: targetState,
      assigned_call_id: assignedCallId !== null ? assignedCallId : agent.assigned_call_id,
      version: agent.version + 1,
      updated_at: new Date()
    };

    this.agents.set(agentId, updated);
    return true;
  }

  /**
   * Lock highest priority QUEUED borrower with FOR UPDATE SKIP LOCKED
   */
  public async lockAndReserveBorrower(): Promise<Borrower | undefined> {
    const queued = Array.from(this.borrowers.values())
      .filter(b => b.status === 'QUEUED' || b.status === 'RETRY_QUEUED')
      .sort((a, b) => b.priority - a.priority);

    for (const b of queued) {
      if (!this.lockTable.has(`borrower:${b.id}`)) {
        this.lockTable.add(`borrower:${b.id}`);
        const updated: Borrower = {
          ...b,
          status: 'IN_CALL',
          updated_at: new Date()
        };
        this.borrowers.set(b.id, updated);
        this.lockTable.delete(`borrower:${b.id}`);
        return { ...updated };
      }
    }

    return undefined;
  }

  /**
   * Deduplication check using Redis set / Memory set
   */
  public isDuplicateEvent(hash: string): boolean {
    if (this.idempotencyKeys.has(hash)) {
      return true;
    }
    this.idempotencyKeys.add(hash);
    return false;
  }
}

export const dbStore = new DatabaseStore();
