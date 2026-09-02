"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const ws_1 = require("ws");
const store_1 = require("./db/store");
const predictiveEngine_1 = require("./engines/predictiveEngine");
const safetyController_1 = require("./engines/safetyController");
const progressiveDialer_1 = require("./engines/progressiveDialer");
const sweeper_1 = require("./fault-tolerance/sweeper");
const circuitBreaker_1 = require("./fault-tolerance/circuitBreaker");
const scenarioHarness_1 = require("./simulators/scenarioHarness");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
let wss = null;
// Seed default pool data on server startup
scenarioHarness_1.ScenarioSimulationHarness.initializePool(25, 200).catch(console.error);
function broadcastTelemetry() {
    if (!wss)
        return;
    const payload = JSON.stringify({
        type: 'TELEMETRY_UPDATE',
        timestamp: new Date().toISOString(),
        circuitBreakers: {
            providerA: circuitBreaker_1.providerACircuitBreaker.getState(),
            providerB: circuitBreaker_1.providerBCircuitBreaker.getState()
        },
        safetyLogs: safetyController_1.SafetyController.getLogs().slice(0, 10)
    });
    wss.clients.forEach(client => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(payload);
        }
    });
}
// REST Endpoints
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', system: 'SmartDialer Core Engine', timestamp: new Date() });
});
app.get('/api/agents', async (req, res) => {
    const agents = await store_1.dbStore.getAgents();
    res.json(agents);
});
app.get('/api/calls', async (req, res) => {
    const calls = await store_1.dbStore.getCalls();
    res.json(calls);
});
app.get('/api/borrowers', async (req, res) => {
    const borrowers = await store_1.dbStore.getBorrowers();
    res.json(borrowers);
});
app.get('/api/telemetry', async (req, res) => {
    const pacing = await predictiveEngine_1.PredictiveEngine.calculateCurrentPacing();
    const agents = await store_1.dbStore.getAgents();
    const calls = await store_1.dbStore.getCalls();
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
            providerA: circuitBreaker_1.providerACircuitBreaker.getState(),
            providerB: circuitBreaker_1.providerBCircuitBreaker.getState()
        },
        safetyLogs: safetyController_1.SafetyController.getLogs().slice(0, 10)
    });
});
app.post('/api/simulations/run', async (req, res) => {
    const { scenario } = req.body;
    if (!scenario || !['A', 'B', 'C', 'D'].includes(scenario)) {
        return res.status(400).json({ error: 'Invalid scenario. Must be A, B, C, or D.' });
    }
    try {
        const result = await scenarioHarness_1.ScenarioSimulationHarness.runScenario(scenario);
        broadcastTelemetry();
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/simulations/drop-shock', async (req, res) => {
    try {
        // Simulate 40% agent drop shock filter trigger in Safety Controller
        const result = safetyController_1.SafetyController.evaluateRequest(20, 10, // Available agents dropped from 25 to 10 (>30% drop in <5s)
        0, 0.001, 0.01, 140);
        broadcastTelemetry();
        res.json({ success: true, message: 'Simulated 40% Mass Agent Drop Shock! Safety Firewall frozen for 30s.', result });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/dialer/trigger', async (req, res) => {
    try {
        const calls = await progressiveDialer_1.ProgressiveDialer.executePacing('camp-1');
        broadcastTelemetry();
        res.json({ success: true, count: calls.length, calls });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Only listen on port & start background timers in non-Vercel environment
if (!process.env.VERCEL) {
    const server = (0, http_1.createServer)(app);
    wss = new ws_1.WebSocketServer({ server });
    setInterval(async () => {
        await sweeper_1.StaleStateSweeper.runSweep(10000);
        broadcastTelemetry();
    }, 2000);
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => {
        console.log(`SmartDialer Backend Server running on port ${PORT}`);
    });
}
exports.default = app;
module.exports = app;
module.exports.default = app;
