import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { dbStore } from './db/store';
import { PredictiveEngine } from './engines/predictiveEngine';
import { SafetyController } from './engines/safetyController';
import { ProgressiveDialer } from './engines/progressiveDialer';
import { StaleStateSweeper } from './fault-tolerance/sweeper';
import { providerACircuitBreaker, providerBCircuitBreaker } from './fault-tolerance/circuitBreaker';
import { ScenarioSimulationHarness } from './simulators/scenarioHarness';

const app = express();
app.use(cors());
app.use(express.json());

let wss: WebSocketServer | null = null;

// Seed default pool data on server startup
ScenarioSimulationHarness.initializePool(25, 200).catch(console.error);

function broadcastTelemetry() {
  if (!wss) return;
  const payload = JSON.stringify({
    type: 'TELEMETRY_UPDATE',
    timestamp: new Date().toISOString(),
    circuitBreakers: {
      providerA: providerACircuitBreaker.getState(),
      providerB: providerBCircuitBreaker.getState()
    },
    safetyLogs: SafetyController.getLogs().slice(0, 10)
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', system: 'SmartDialer Core Engine', timestamp: new Date() });
});

app.get('/api/agents', async (req, res) => {
  let agents = await dbStore.getAgents();
  if (agents.length === 0) {
    await ScenarioSimulationHarness.initializePool(25, 200);
    agents = await dbStore.getAgents();
  }
  res.json(agents);
});

app.get('/api/calls', async (req, res) => {
  const calls = await dbStore.getCalls();
  res.json(calls);
});

app.get('/api/borrowers', async (req, res) => {
  let borrowers = await dbStore.getBorrowers();
  if (borrowers.length === 0) {
    await ScenarioSimulationHarness.initializePool(25, 200);
    borrowers = await dbStore.getBorrowers();
  }
  res.json(borrowers);
});

app.get('/api/telemetry', async (req, res) => {
  const pacing = await PredictiveEngine.calculateCurrentPacing();
  const agents = await dbStore.getAgents();
  const calls = await dbStore.getCalls();

  const totalCalls = calls.length;
  const completedCalls = calls.filter(c => c.state === 'COMPLETED').length;
  const failedCalls = calls.filter(c => c.state === 'FAILED').length;
  const activeCalls = calls.filter(c => c.state === 'INITIATED' || c.state === 'RINGING' || c.state === 'CONNECTED').length;

  res.json({
    pacing,
    stats: {
      totalAgents: agents.length,
      availableAgents: agents.filter(a => a.state === 'AVAILABLE').length,
      connectedAgents: agents.filter(a => a.state === 'CONNECTED').length,
      totalCalls,
      completedCalls,
      failedCalls,
      activeCalls
    },
    circuitBreakers: {
      providerA: providerACircuitBreaker.getState(),
      providerB: providerBCircuitBreaker.getState()
    },
    safetyLogs: SafetyController.getLogs().slice(0, 10)
  });
});

app.post('/api/simulations/run', async (req, res) => {
  const { scenario } = req.body;
  if (!scenario || !['A', 'B', 'C', 'D'].includes(scenario)) {
    return res.status(400).json({ error: 'Invalid scenario. Must be A, B, C, or D.' });
  }

  try {
    const result = await ScenarioSimulationHarness.runScenario(scenario);
    broadcastTelemetry();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/simulations/drop-shock', async (req, res) => {
  try {
    // Simulate 40% agent drop shock filter trigger in Safety Controller
    const result = SafetyController.evaluateRequest(
      20,
      10, // Available agents dropped from 25 to 10 (>30% drop in <5s)
      0,
      0.001,
      0.01,
      140
    );
    broadcastTelemetry();
    res.json({ success: true, message: 'Simulated 40% Mass Agent Drop Shock! Safety Firewall frozen for 30s.', result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/api/dialer/trigger', async (req, res) => {
  try {
    const calls = await ProgressiveDialer.executePacing('camp-1');
    broadcastTelemetry();
    res.json({ success: true, count: calls.length, calls });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Only listen on port & start background timers in non-Vercel environment
if (!process.env.VERCEL) {
  const server = createServer(app);
  wss = new WebSocketServer({ server });

  setInterval(async () => {
    await StaleStateSweeper.runSweep(10000);
    broadcastTelemetry();
  }, 2000);

  const PORT = process.env.PORT || 4000;
  server.listen(PORT, () => {
    console.log(`SmartDialer Backend Server running on port ${PORT}`);
  });
}

export default app;
module.exports = app;
module.exports.default = app;


