// Simple CORS proxy for ParkPass
// Run with: node proxy.js
// Then open your page on http://localhost:3000

const http  = require('http');
const https = require('https');
const url   = require('url');

const PORT       = 3000;
const API_TARGET = 'http://localhost:9080';

const server = http.createServer((req, res) => {
  // Allow all origins (fixes CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const target = url.parse(API_TARGET);
  const options = {
    hostname: target.hostname,
    port:     target.port || 80,
    path:     req.url,
    method:   req.method,
    headers:  { ...req.headers, host: target.host },
  };

  console.log(`→ ${req.method} ${req.url}`);

  const proxy = http.request(options, (apiRes) => {
    res.writeHead(apiRes.statusCode, {
      ...apiRes.headers,
      'Access-Control-Allow-Origin': '*',
    });
    apiRes.pipe(res, { end: true });
  });

  proxy.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502);
    res.end(JSON.stringify({ error: 'Proxy error', detail: err.message }));
  });

  req.pipe(proxy, { end: true });
});

server.listen(PORT, () => {
  console.log(`✅ CORS proxy running at http://localhost:${PORT}`);
  console.log(`   Forwarding → ${API_TARGET}`);
  console.log(`   Open your parking.html via http://localhost:${PORT}/parking.html`);
});
