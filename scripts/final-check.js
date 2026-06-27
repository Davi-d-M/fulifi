const net = require('net');
require('dotenv').config({ path: '.env.local' });

const host = process.env.MIKROTIK_HOST;
const port = parseInt(process.env.MIKROTIK_PORT);

console.log(`\n[Final System Check] Testing MikroTik Tunnel: ${host}:${port}...`);

const socket = new net.Socket();
const startTime = Date.now();

socket.setTimeout(10000);

socket.on('connect', () => {
    console.log(`✅ TUNNEL SUCCESS: Handshake with MikroTik took ${Date.now() - startTime}ms.`);
    console.log(`- Connection is stable.`);
    socket.destroy();
    process.exit(0);
});

socket.on('timeout', () => {
    console.log(`❌ TUNNEL FAIL: Timeout (10s). The ngrok TCP window might be closed.`);
    process.exit(1);
});

socket.on('error', (err) => {
    console.log(`❌ TUNNEL ERROR: ${err.message}`);
    console.log(`- Tip: Make sure your 2nd ngrok window is running: ngrok tcp 10.5.50.1:8728`);
    process.exit(1);
});

socket.connect(port, host);
