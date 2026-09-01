import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * k6 Load Test Script for SmartDialer
 * Simulates 1,000 agents and up to 10,000 calls per second.
 * Measures DB Connection Pool latency & Row-Lock contention.
 */
export const options = {
  stages: [
    { duration: '30s', target: 500 },  // Ramp-up to 500 VUs
    { duration: '1m', target: 1000 },  // Sustained load with 1,000 VUs (simulating 1,000 agents)
    { duration: '30s', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests must complete under 500ms
    http_req_failed: ['rate<0.01'],    // Error rate must be under 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
  // 1. Fetch Telemetry
  const telemetryRes = http.get(`${BASE_URL}/api/telemetry`);
  check(telemetryRes, {
    'telemetry status is 200': (r) => r.status === 200,
    'pacing response present': (r) => r.json('pacing') !== undefined,
  });

  // 2. Trigger Outbound Dial (Simulating concurrency row locks)
  const dialRes = http.post(`${BASE_URL}/api/dialer/trigger`, JSON.stringify({ campaignId: 'camp-1' }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(dialRes, {
    'dialer status is 200': (r) => r.status === 200,
  });

  sleep(0.1); // 100ms pacing delay between VU iterations
}
