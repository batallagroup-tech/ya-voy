const fetch = require('node-fetch');
fetch('https://ya-voy-api.onrender.com/api/stripe/setup-intent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'test-user' })
}).then(r => r.json()).then(console.log).catch(console.error);
