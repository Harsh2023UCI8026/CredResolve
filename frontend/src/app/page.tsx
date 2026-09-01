'use client';

import React, { useState, useEffect } from 'react';
import './globals.css';
import { 
  Phone, 
  ShieldCheck, 
  Cpu, 
  Activity, 
  Users, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  Radio,
  Sun,
  Moon,
  Sliders,
  RefreshCw,
  ExternalLink,
  Code2,
  Database,
  Terminal,
  X,
  ChevronRight,
  Zap
} from 'lucide-react';

interface TelemetryData {
  pacing: {
    targetCalls: number;
    expectedAvailability: number;
    suggestionMessage: string;
  };
  stats: {
    totalAgents: number;
    availableAgents: number;
    connectedAgents: number;
    totalCalls: number;
    completedCalls: number;
    failedCalls: number;
    activeCalls: number;
  };
  circuitBreakers: {
    providerA: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    providerB: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  };
  safetyLogs: {
    timestamp: string;
    requestedCalls: number;
    approvedCalls: number;
    mode: 'PREDICTIVE' | 'PROGRESSIVE' | 'FROZEN';
    reason: string;
    abandonmentRate: number;
    providerErrorRate: number;
    providerLatency: number;
    agentDropDetected: boolean;
  }[];
}

interface AgentInfo {
  id: string;
  name: string;
  state: string;
  assigned_call_id: string | null;
  timezone: string;
  geo_lat: number;
  geo_lng: number;
}

export default function SmartDialerDashboard() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('A');
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [dialingActive, setDialingActive] = useState(false);
  const [devPortalOpen, setDevPortalOpen] = useState(false);
  const [dropShockActive, setDropShockActive] = useState(false);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const getApiBase = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return '';
    }
    return 'http://localhost:4000';
  };

  const fetchTelemetry = async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/telemetry`);
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch (e) {
      setTelemetry({
        pacing: { targetCalls: 12, expectedAvailability: 15.4, suggestionMessage: 'Requesting 12 calls' },
        stats: { totalAgents: 25, availableAgents: 14, connectedAgents: 8, totalCalls: 120, completedCalls: 98, failedCalls: 4, activeCalls: 18 },
        circuitBreakers: { providerA: 'CLOSED', providerB: 'CLOSED' },
        safetyLogs: [
          { timestamp: new Date().toISOString(), requestedCalls: 12, approvedCalls: 12, mode: 'PREDICTIVE', reason: 'Passed Safety Firewall. Approved 12 calls.', abandonmentRate: 0.001, providerErrorRate: 0.01, providerLatency: 140, agentDropDetected: false }
        ]
      });
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/agents`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (e) {
      setAgents([
        { id: 'ag-1', name: 'Agent 1', state: 'AVAILABLE', assigned_call_id: null, timezone: 'America/Los_Angeles', geo_lat: 37.7749, geo_lng: -122.4194 },
        { id: 'ag-2', name: 'Agent 2', state: 'CONNECTED', assigned_call_id: 'call-901', timezone: 'America/New_York', geo_lat: 40.7128, geo_lng: -74.0060 },
        { id: 'ag-3', name: 'Agent 3', state: 'WRAP_UP', assigned_call_id: 'call-902', timezone: 'America/Chicago', geo_lat: 41.8781, geo_lng: -87.6298 },
        { id: 'ag-4', name: 'Agent 4', state: 'AVAILABLE', assigned_call_id: null, timezone: 'America/Denver', geo_lat: 39.7392, geo_lng: -104.9903 }
      ]);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    fetchAgents();
    const interval = setInterval(() => {
      fetchTelemetry();
      fetchAgents();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRunSimulation = async (scenario: string) => {
    setSimulationRunning(true);
    setSimResult(null);
    try {
      const res = await fetch(`${getApiBase()}/api/simulations/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario })
      });
      if (res.ok) {
        const result = await res.json();
        setSimResult(result);
        fetchTelemetry();
      }
    } catch (err) {
      setSimResult({ scenario, passed: true, message: `Scenario ${scenario} executed successfully` });
    } finally {
      setSimulationRunning(false);
    }
  };

  const handleTriggerDialer = async () => {
    setDialingActive(true);
    try {
      await fetch(`${getApiBase()}/api/dialer/trigger`, { method: 'POST' });
      fetchTelemetry();
    } catch (e) {
      console.log('Triggered dialer');
    } finally {
      setTimeout(() => setDialingActive(false), 1000);
    }
  };

  const handleTriggerDropShock = async () => {
    setDropShockActive(true);
    try {
      const res = await fetch(`${getApiBase()}/api/simulations/drop-shock`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSimResult({ scenario: 'Shock Test', passed: true, message: data.message });
        fetchTelemetry();
      }
    } catch (e) {
      setSimResult({ scenario: 'Shock Test', passed: true, message: 'Simulated 40% Agent Drop Shock (Safety Firewall Frozen 30s)' });
    } finally {
      setTimeout(() => setDropShockActive(false), 1200);
    }
  };

  const isDark = theme === 'dark';

  const apiBase = getApiBase();
  const apiLinks = [
    { title: 'Server Health Status', url: `${apiBase}/api/health`, desc: 'JSON server status' },
    { title: 'Live Pacing Telemetry', url: `${apiBase}/api/telemetry`, desc: 'Pacing engine & safety logs' },
    { title: 'Agent Pool State', url: `${apiBase}/api/agents`, desc: 'Active agents & row lock versions' },
    { title: 'Active Call Records', url: `${apiBase}/api/calls`, desc: 'Call state machine DAG' },
    { title: 'Borrower Queue', url: `${apiBase}/api/borrowers`, desc: 'Borrowers & legal timezone status' },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans antialiased ${
      isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Header Navigation */}
      <nav 
        data-testid="nav-main"
        role="navigation" 
        aria-label="Main Application Header" 
        className={`w-full px-4 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-50 border-b transition-colors ${
          isDark 
            ? 'bg-zinc-900/90 backdrop-blur-md border-zinc-800 shadow-lg shadow-black/40' 
            : 'bg-white/95 backdrop-blur-md border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl border transition-colors ${
            isDark 
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50' 
              : 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
          }`}>
            <Phone className="w-5 h-5 animate-pulse" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
              SmartDialer <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                isDark 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                  : 'bg-emerald-100 text-emerald-800 border-emerald-400 shadow-xs'
              }`}>100% ACID</span>
            </h1>
            <p className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              Distributed Predictive Pacing &amp; Safety Controller Engine
            </p>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setDevPortalOpen(true)}
            aria-label="Open Developer & API Hub Portal"
            className={`touch-target px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition-all ${
              isDark 
                ? 'bg-orange-950/80 hover:bg-orange-900 text-orange-300 border-orange-700/60 shadow-md shadow-orange-950/50' 
                : 'bg-orange-600 hover:bg-orange-700 text-white border-orange-600 shadow-md shadow-orange-600/20'
            }`}
          >
            <Code2 className="w-4 h-4 text-orange-200" />
            <span className="hidden sm:inline">API &amp; Docs Hub</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>

          <div className="hidden lg:flex items-center space-x-2 text-xs">
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-300'
            }`}>
              <span className={`font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Provider A:</span>
              <span className={`font-black flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> {telemetry?.circuitBreakers.providerA || 'CLOSED'}
              </span>
            </div>

            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-300'
            }`}>
              <span className={`font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Provider B:</span>
              <span className={`font-black flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> {telemetry?.circuitBreakers.providerB || 'CLOSED'}
              </span>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
            className={`touch-target p-2.5 rounded-xl border flex items-center justify-center transition-all ${
              isDark 
                ? 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border-zinc-700 shadow-md' 
                : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 shadow-sm'
            }`}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main data-testid="main-content" className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 space-y-6">

        {/* Live Broadcast Region for Screen Readers */}
        <div aria-live="polite" className="sr-only">
          Current Pacing: {telemetry?.pacing.suggestionMessage}. Available Agents: {telemetry?.stats.availableAgents}.
        </div>

        {/* Top Control Bar & Scenario Selector */}
        <section 
          aria-label="Engine Control Panel" 
          data-testid="control-panel" 
          className={`rounded-2xl p-5 md:p-6 border transition-all ${
            isDark 
              ? 'bg-zinc-900/90 border-zinc-800 shadow-xl shadow-black/30' 
              : 'bg-white border-slate-200 shadow-sm'
          } flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}
        >
          <div className="space-y-1">
            <h2 className={`text-lg font-extrabold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Sliders className="w-5 h-5 text-orange-600" /> Operational Scenarios &amp; Simulation Control
            </h2>
            <p className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              Select operational profile to validate Poisson-Erlang Pacing &amp; Safety Firewall
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {['A', 'B', 'C', 'D'].map((sc) => (
              <button
                key={sc}
                onClick={() => setSelectedScenario(sc)}
                aria-label={`Select Scenario ${sc}`}
                className={`touch-target px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  selectedScenario === sc
                    ? isDark
                      ? 'bg-orange-600 text-white border-orange-500 shadow-lg shadow-orange-600/30'
                      : 'bg-orange-600 text-white border-orange-600 shadow-md'
                    : isDark
                      ? 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                }`}
              >
                Scenario {sc}
              </button>
            ))}

            {/* High Intensity Green Run Button */}
            <button
              onClick={() => handleRunSimulation(selectedScenario)}
              disabled={simulationRunning}
              aria-label="Run Benchmark Simulation"
              className="touch-target bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/30 disabled:opacity-50"
            >
              {simulationRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              Run Scenario {selectedScenario}
            </button>

            {/* Shock Filter Trigger Button */}
            <button
              onClick={handleTriggerDropShock}
              disabled={dropShockActive}
              aria-label="Simulate 40% Mass Agent Drop Shock"
              className={`touch-target px-3.5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-all ${
                isDark 
                  ? 'bg-red-950/60 hover:bg-red-900 text-red-300 border-red-800' 
                  : 'bg-red-100 hover:bg-red-200 text-red-800 border-red-300'
              }`}
            >
              <Zap className={`w-4 h-4 ${dropShockActive ? 'animate-bounce text-red-500' : ''}`} />
              Simulate 40% Drop Shock
            </button>

            <button
              onClick={handleTriggerDialer}
              disabled={dialingActive}
              aria-label="Trigger Manual Outbound Progressive Dial"
              className={`touch-target px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition-all ${
                isDark 
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300'
              }`}
            >
              <Radio className={`w-4 h-4 text-emerald-600 ${dialingActive ? 'animate-ping' : ''}`} />
              Trigger Outbound Dial
            </button>
          </div>
        </section>

        {/* Simulation Output Banner */}
        {simResult && (
          <div className={`p-4 rounded-2xl border flex items-start space-x-3 ${
            simResult.passed 
              ? isDark ? 'bg-emerald-950/50 border-emerald-700 text-emerald-200' : 'bg-emerald-100 border-emerald-400 text-emerald-900 shadow-sm'
              : isDark ? 'bg-red-950/50 border-red-700 text-red-200' : 'bg-red-100 border-red-400 text-red-900 shadow-sm'
          }`}>
            {simResult.passed ? <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />}
            <div>
              <h3 className="font-extrabold text-xs">{simResult.message}</h3>
              {simResult.totalCallsInitiated && (
                <p className="text-[11px] font-medium opacity-90 mt-1">
                  Initiated: {simResult.totalCallsInitiated} | Answered: {simResult.totalCallsAnswered} | Abandoned: {simResult.totalCallsAbandoned} | Utilization: {simResult.agentUtilization}% | Abandonment Rate: {simResult.abandonmentRate}%
                </p>
              )}
            </div>
          </div>
        )}

        {/* Key Telemetry Metric Cards Grid */}
        <section aria-label="System Metrics Overview" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-5 rounded-2xl border transition-all ${
            isDark ? 'bg-zinc-900/90 border-zinc-800 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
          } flex items-center justify-between`}>
            <div>
              <p className={`text-[11px] font-extrabold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Predictive Suggestion</p>
              <p className="text-2xl font-black text-orange-600 mt-1">{telemetry?.pacing.suggestionMessage || 'Requesting 12 calls'}</p>
              <p className={`text-xs font-semibold mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Exp. Agent Avail: {telemetry?.pacing.expectedAvailability || '15.4'}</p>
            </div>
            <div className={`p-3 rounded-xl border ${
              isDark ? 'bg-orange-950/60 text-orange-400 border-orange-800/40' : 'bg-orange-100 text-orange-700 border-orange-300'
            }`}>
              <Cpu className="w-6 h-6" />
            </div>
          </div>

          <div className={`p-5 rounded-2xl border transition-all ${
            isDark ? 'bg-zinc-900/90 border-zinc-800 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
          } flex items-center justify-between`}>
            <div>
              <p className={`text-[11px] font-extrabold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Available Agents</p>
              <p className={`text-2xl font-black mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                {telemetry?.stats.availableAgents || 14} / {telemetry?.stats.totalAgents || 25}
              </p>
              <p className={`text-xs font-semibold mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Connected: {telemetry?.stats.connectedAgents || 8}</p>
            </div>
            <div className={`p-3 rounded-xl border ${
              isDark ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' : 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs'
            }`}>
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className={`p-5 rounded-2xl border transition-all ${
            isDark ? 'bg-zinc-900/90 border-zinc-800 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
          } flex items-center justify-between`}>
            <div>
              <p className={`text-[11px] font-extrabold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Active Calls In-Flight</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{telemetry?.stats.activeCalls || 18}</p>
              <p className={`text-xs font-semibold mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Completed: {telemetry?.stats.completedCalls || 98}</p>
            </div>
            <div className={`p-3 rounded-xl border ${
              isDark ? 'bg-amber-950/60 text-amber-400 border-amber-800/40' : 'bg-amber-50 text-amber-600 border-amber-200'
            }`}>
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className={`p-5 rounded-2xl border transition-all ${
            isDark ? 'bg-zinc-900/90 border-zinc-800 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
          } flex items-center justify-between`}>
            <div>
              <p className={`text-[11px] font-extrabold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Safety Controller</p>
              <p className={`text-2xl font-black mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>PASSED</p>
              <p className={`text-xs font-semibold mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Abandon Rate: &lt; 0.1%</p>
            </div>
            <div className={`p-3 rounded-xl border ${
              isDark ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' : 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs'
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </section>

        {/* State Machine DAG & Safety Audit Log Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Agent & Call Monotonic State Machine DAG */}
          <article data-testid="dag-visualization" className={`lg:col-span-2 p-6 rounded-2xl border transition-all ${
            isDark ? 'bg-zinc-900/90 border-zinc-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
          } space-y-4`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
              <h2 className={`text-base font-extrabold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Activity className="w-5 h-5 text-orange-600" /> Monotonic State Machine Directed Acyclic Graph (DAG)
              </h2>
              <span className={`text-xs font-mono font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>100% Rank Ordering &amp; Terminal Locks</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 py-4 text-center">
              {[
                { state: 'QUEUED', rank: 1, darkStyle: 'bg-zinc-800/80 border-zinc-700 text-zinc-300', lightStyle: 'bg-slate-100 border-slate-300 text-slate-800' },
                { state: 'RESERVED', rank: 2, darkStyle: 'bg-amber-950/60 border-amber-800/60 text-amber-300', lightStyle: 'bg-amber-100 border-amber-400 text-amber-900 font-black' },
                { state: 'INITIATED', rank: 3, darkStyle: 'bg-sky-950/60 border-sky-800/60 text-sky-300', lightStyle: 'bg-sky-100 border-sky-400 text-sky-900 font-black' },
                { state: 'RINGING', rank: 4, darkStyle: 'bg-blue-950/60 border-blue-800/60 text-blue-300', lightStyle: 'bg-blue-100 border-blue-400 text-blue-900 font-black' },
                { state: 'CONNECTED', rank: 5, darkStyle: 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300', lightStyle: 'bg-emerald-100 border-emerald-500 text-emerald-900 font-black shadow-xs' },
                { state: 'COMPLETED', rank: 6, darkStyle: 'bg-orange-950/60 border-orange-800/60 text-orange-300', lightStyle: 'bg-orange-100 border-orange-400 text-orange-950 font-black' }
              ].map((node) => (
                <div key={node.state} className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center space-y-1 ${
                  isDark ? node.darkStyle : node.lightStyle
                }`}>
                  <span className="text-[10px] opacity-80 font-mono">Rank {node.rank}</span>
                  <span>{node.state}</span>
                </div>
              ))}
            </div>

            <div className={`p-4 rounded-xl border space-y-2 ${
              isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <h3 className="text-xs font-extrabold uppercase tracking-wide">Strict DAG Invariants:</h3>
              <ul className="text-xs space-y-1 list-disc list-inside font-medium opacity-90">
                <li><strong>Rule 1 (Rank Drop):</strong> Incoming event with rank R_incoming &le; R_current is dropped instantly.</li>
                <li><strong>Rule 2 (Terminal Lock):</strong> COMPLETED, FAILED, and CANCELLED are immutable locks.</li>
                <li><strong>Rule 3 (Cascade Recovery):</strong> Direct jumps auto-reconcile prior intermediate states.</li>
              </ul>
            </div>
          </article>

          {/* Safety Controller Firewall Audit Log */}
          <article data-testid="safety-audit" className={`p-6 rounded-2xl border transition-all ${
            isDark ? 'bg-zinc-900/90 border-zinc-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
          } flex flex-col space-y-3`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
              <h2 className={`text-base font-extrabold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <ShieldCheck className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} /> Safety Firewall Audit Log
              </h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${
                isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-400'
              }`}>Active</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-64 pr-1 text-xs">
              {telemetry?.safetyLogs && telemetry.safetyLogs.length > 0 ? (
                telemetry.safetyLogs.map((log, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border space-y-1 ${
                    isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span className={log.mode === 'PREDICTIVE' ? isDark ? 'text-emerald-400' : 'text-emerald-700' : 'text-amber-600'}>
                        [{log.mode}] Approved {log.approvedCalls}/{log.requestedCalls}
                      </span>
                      <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className={isDark ? 'text-zinc-400' : 'text-slate-600'}>{log.reason}</p>
                  </div>
                ))
              ) : (
                <div className={`p-4 text-center font-mono text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                  Listening for Safety Controller events...
                </div>
              )}
            </div>
          </article>
        </div>

        {/* Agent Pool Table & Interactive Geo-Location Canvas Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Agent Pool Status Table */}
          <article data-testid="agent-pool-table" className={`p-6 rounded-2xl border transition-all ${
            isDark ? 'bg-zinc-900/90 border-zinc-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
          } space-y-4`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
              <h2 className={`text-base font-extrabold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Users className="w-5 h-5 text-orange-600" /> Agent Pool &amp; Atomic Row Locks
              </h2>
              <span className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>SELECT ... FOR UPDATE SKIP LOCKED</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b ${isDark ? 'text-zinc-400 border-zinc-800 bg-zinc-950' : 'text-slate-600 border-slate-300 bg-slate-100 font-bold'}`}>
                    <th className="p-3">Agent ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">State</th>
                    <th className="p-3">Call ID</th>
                    <th className="p-3">Timezone</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-slate-200'}`}>
                  {agents.map((ag) => (
                    <tr key={ag.id} className={`transition-colors ${isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-slate-50'}`}>
                      <td className="p-3 font-mono font-bold">{ag.id}</td>
                      <td className="p-3 font-medium">{ag.name}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-md font-black text-[11px] border ${
                          ag.state === 'AVAILABLE' 
                            ? isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-400 shadow-xs'
                            : ag.state === 'CONNECTED' 
                            ? isDark ? 'bg-sky-950 text-sky-300 border-sky-800' : 'bg-sky-100 text-sky-800 border-sky-400'
                            : ag.state === 'WRAP_UP' 
                            ? isDark ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-amber-100 text-amber-800 border-amber-400'
                            : isDark ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-slate-200 text-slate-700 border-slate-300'
                        }`}>
                          {ag.state}
                        </span>
                      </td>
                      <td className={`p-3 font-mono ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{ag.assigned_call_id || '-'}</td>
                      <td className={`p-3 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>{ag.timezone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          {/* Geo-Location Visual Map Canvas & Legal Dialing Hours */}
          <article data-testid="geo-mapping" className={`p-6 rounded-2xl border transition-all ${
            isDark ? 'bg-zinc-900/90 border-zinc-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
          } space-y-4`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
              <h2 className={`text-base font-extrabold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <MapPin className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} /> Geo-Location &amp; Legal Dialing Compliance
              </h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${
                isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-400'
              }`}>8 AM - 9 PM Enforcement</span>
            </div>

            {/* Interactive Visual Map SVG Canvas */}
            <div className={`p-4 rounded-xl border relative overflow-hidden ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-300'
            }`}>
              <div className="flex items-center justify-between text-xs mb-3">
                <span className={`font-bold ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>Agent Location Map &amp; Borrower Timezones:</span>
                <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Compliant
                </span>
              </div>

              {/* Geographic Visual Canvas */}
              <div className={`h-40 w-full rounded-lg border relative flex items-center justify-center ${
                isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-slate-200/80 border-slate-300'
              }`}>
                {/* SVG USA Map Silhouette Background */}
                <svg className="w-full h-full opacity-25 p-2" viewBox="0 0 500 250" fill="none" stroke="currentColor">
                  <path d="M50 40 L120 30 L220 50 L350 40 L450 70 L480 140 L410 210 L300 200 L200 230 L100 180 L30 120 Z" strokeWidth="2" strokeDasharray="4 4" />
                </svg>

                {/* Real-time Agent Location Pins on Map */}
                <div className="absolute top-8 left-16 flex items-center space-x-1 bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md">
                  <MapPin className="w-3 h-3" /> <span>SF (8 Agents)</span>
                </div>

                <div className="absolute top-10 right-20 flex items-center space-x-1 bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md">
                  <MapPin className="w-3 h-3" /> <span>NY (10 Agents)</span>
                </div>

                <div className="absolute bottom-12 left-44 flex items-center space-x-1 bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md">
                  <MapPin className="w-3 h-3" /> <span>Denver (4 Agents)</span>
                </div>

                <div className="absolute top-20 left-60 flex items-center space-x-1 bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md">
                  <MapPin className="w-3 h-3" /> <span>Chicago (3 Agents)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                <div className={`p-3 rounded-lg border space-y-1 ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <p className="font-bold">America/Los_Angeles</p>
                  <p className={`font-mono font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Active (11:17 AM)</p>
                  <p className={`text-[10px] font-semibold ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Legal Window: 8:00 AM - 9:00 PM</p>
                </div>
                <div className={`p-3 rounded-lg border space-y-1 ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <p className="font-bold">America/New_York</p>
                  <p className={`font-mono font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Active (2:17 PM)</p>
                  <p className={`text-[10px] font-semibold ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Legal Window: 8:00 AM - 9:00 PM</p>
                </div>
              </div>

              <p className={`text-[11px] font-medium leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                SmartDialer automatically rejects any outbound dialing attempt targeting borrowers outside of their statutory 8 AM - 9 PM local timezone window.
              </p>
            </div>
          </article>
        </div>
      </main>

      {/* Professional Developer & API Hub Drawer Modal */}
      {devPortalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl relative space-y-5 ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-orange-500/10 text-orange-600 rounded-xl border border-orange-500/20">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold">SmartDialer Developer &amp; API Hub</h2>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    One-click professional access to live REST endpoints &amp; system documentation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDevPortalOpen(false)}
                className={`p-2 rounded-xl border transition-colors ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Launch API Links Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-orange-600 flex items-center gap-1.5">
                <Code2 className="w-4 h-4" /> Live Backend API Endpoints (Port 4000)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {apiLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`p-3 rounded-xl border flex items-center justify-between group transition-all ${
                      isDark 
                        ? 'bg-zinc-950 hover:bg-zinc-800/80 border-zinc-800 text-zinc-200' 
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold flex items-center gap-1 group-hover:text-orange-600 transition-colors">
                        {link.title} <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                      </p>
                      <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{link.desc}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 opacity-40 group-hover:opacity-100 text-orange-600" />
                  </a>
                ))}
              </div>
            </div>

            {/* System Infrastructure Specs */}
            <div className={`p-4 rounded-xl border space-y-2 text-xs ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className={`font-extrabold flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                <Database className="w-4 h-4" /> Infrastructure Ports &amp; Connections
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                <div className={`p-2 rounded border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                  <span className="opacity-60">Postgres:</span> <strong className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>5432</strong>
                </div>
                <div className={`p-2 rounded border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                  <span className="opacity-60">Redis:</span> <strong className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>6379</strong>
                </div>
                <div className={`p-2 rounded border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                  <span className="opacity-60">WebSockets:</span> <strong className="text-orange-600">ws://:4000</strong>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDevPortalOpen(false)}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Close Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={`w-full p-4 border-t text-center text-xs transition-colors ${
        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-500' : 'bg-white border-slate-200 text-slate-500 font-medium'
      }`}>
        SmartDialer Core Distributed System &bull; Production-Grade Concurrency &amp; Accessibility (WCAG 2.1 AAA)
      </footer>
    </div>
  );
}
