const axios = require('axios');

const BASE_URL = 'http://localhost:5003/api/v1';

async function runComprehensiveAudit() {
  console.log('=== COMPREHENSIVE BACKEND API AUDIT ===');
  const results = [];

  // 1. Auth Login
  let token = null;
  let user = null;
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'captain@aquascope.com',
      password: 'Captain@123'
    });
    token = res.data.token || (res.data.data && res.data.data.token);
    user = res.data.user || (res.data.data && res.data.data.user);
    results.push({ name: 'POST /auth/login', status: res.status, ok: true });
  } catch (err) {
    results.push({ name: 'POST /auth/login', status: err.response?.status || 500, ok: false, error: err.response?.data || err.message });
  }

  if (!token) {
    console.error('FATAL: Could not login.');
    return;
  }

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // Fetch Feeds first to get a real feedId
  let sampleFeedId = null;
  try {
    const feedsRes = await axios.get(`${BASE_URL}/feeds`, authHeaders);
    const feedList = feedsRes.data?.data || feedsRes.data || [];
    if (feedList.length > 0) {
      sampleFeedId = feedList[0]._id;
    }
  } catch (err) {
    console.error('Error getting feeds:', err.message);
  }

  const endpoints = [
    // Health & Auth
    { name: 'GET /health', method: 'get', url: `${BASE_URL}/health` },
    { name: 'GET /auth/me', method: 'get', url: `${BASE_URL}/auth/me` },

    // Dashboard
    { name: 'GET /dashboard/summary', method: 'get', url: `${BASE_URL}/dashboard/summary` },
    { name: 'GET /dashboard/system-status', method: 'get', url: `${BASE_URL}/dashboard/system-status` },
    { name: 'GET /dashboard/analytics', method: 'get', url: `${BASE_URL}/dashboard/analytics?period=7d` },
    ...(sampleFeedId ? [{ name: `GET /dashboard/surveillance/${sampleFeedId}`, method: 'get', url: `${BASE_URL}/dashboard/surveillance/${sampleFeedId}` }] : []),

    // Feeds
    { name: 'GET /feeds', method: 'get', url: `${BASE_URL}/feeds` },
    { name: 'GET /feeds/active', method: 'get', url: `${BASE_URL}/feeds/active` },
    { name: 'GET /feeds/stats', method: 'get', url: `${BASE_URL}/feeds/stats` },
    ...(sampleFeedId ? [
      { name: `GET /feeds/${sampleFeedId}`, method: 'get', url: `${BASE_URL}/feeds/${sampleFeedId}` },
      { name: `GET /feeds/${sampleFeedId}/surveillance/ai-analysis`, method: 'get', url: `${BASE_URL}/feeds/${sampleFeedId}/surveillance/ai-analysis` },
      { name: `POST /feeds/${sampleFeedId}/surveillance/stream`, method: 'post', url: `${BASE_URL}/feeds/${sampleFeedId}/surveillance/stream`, data: { action: 'pause' } },
      { name: `POST /feeds/${sampleFeedId}/surveillance/capture`, method: 'post', url: `${BASE_URL}/feeds/${sampleFeedId}/surveillance/capture`, data: {} },
      { name: `POST /feeds/${sampleFeedId}/surveillance/enhance-frame`, method: 'post', url: `${BASE_URL}/feeds/${sampleFeedId}/surveillance/enhance-frame`, data: {} },
      { name: `POST /feeds/${sampleFeedId}/surveillance/mark-area`, method: 'post', url: `${BASE_URL}/feeds/${sampleFeedId}/surveillance/mark-area`, data: { x: 0.1, y: 0.1, w: 0.5, h: 0.5 } },
    ] : []),

    // Alerts
    { name: 'GET /alerts', method: 'get', url: `${BASE_URL}/alerts` },
    { name: 'GET /alerts/active', method: 'get', url: `${BASE_URL}/alerts/active` },
    { name: 'GET /alerts/recent', method: 'get', url: `${BASE_URL}/alerts/recent` },
    { name: 'GET /alerts/stats', method: 'get', url: `${BASE_URL}/alerts/stats` },

    // Detections
    { name: 'GET /detections', method: 'get', url: `${BASE_URL}/detections` },
    { name: 'GET /detections/stats', method: 'get', url: `${BASE_URL}/detections/stats` },

    // Reports
    { name: 'GET /reports/analytics', method: 'get', url: `${BASE_URL}/reports/analytics?timeframe=24h` },
    { name: 'GET /reports/analytics (7d)', method: 'get', url: `${BASE_URL}/reports/analytics?timeframe=7d` },
    { name: 'GET /reports/analytics (30d)', method: 'get', url: `${BASE_URL}/reports/analytics?timeframe=30d` },
    { name: 'POST /reports/dispatch', method: 'post', url: `${BASE_URL}/reports/dispatch`, data: { kind: 'analytics_bundle', timeframe: '24h', recordCount: 10 } },

    // System Logs
    { name: 'GET /system-logs', method: 'get', url: `${BASE_URL}/system-logs` },
    { name: 'POST /system-logs', method: 'post', url: `${BASE_URL}/system-logs`, data: { severity: 'INFO', module: 'AI-DETECTOR', message: 'Audit test log entry' } },

    // Settings
    { name: 'GET /settings', method: 'get', url: `${BASE_URL}/settings` },
    { name: 'PUT /settings', method: 'put', url: `${BASE_URL}/settings`, data: { enhancementStrength: 80, dehazeFactor: 45 } },

    // AI Enhancement
    { name: 'GET /ai-enhance/health', method: 'get', url: `${BASE_URL}/ai-enhance/health` },
    { name: 'GET /ai-enhance/history', method: 'get', url: `${BASE_URL}/ai-enhance/history` },
    { name: 'GET /enhance/history', method: 'get', url: `${BASE_URL}/enhance/history` },
  ];

  for (const ep of endpoints) {
    try {
      let res;
      if (ep.method === 'post') {
        res = await axios.post(ep.url, ep.data || {}, authHeaders);
      } else if (ep.method === 'put') {
        res = await axios.put(ep.url, ep.data || {}, authHeaders);
      } else {
        res = await axios.get(ep.url, authHeaders);
      }
      results.push({ name: ep.name, status: res.status, ok: true });
    } catch (err) {
      results.push({
        name: ep.name,
        status: err.response?.status || 500,
        ok: false,
        error: err.response?.data || err.message
      });
    }
  }

  console.log('\n--- COMPREHENSIVE AUDIT RESULTS ---');
  let failures = 0;
  for (const r of results) {
    if (r.ok) {
      console.log(`[PASS] ${r.name} -> HTTP ${r.status}`);
    } else {
      console.log(`[FAIL] ${r.name} -> HTTP ${r.status}: ${JSON.stringify(r.error)}`);
      failures++;
    }
  }
  console.log(`\nTOTAL: ${results.length}, PASSED: ${results.length - failures}, FAILED: ${failures}`);
}

runComprehensiveAudit();
