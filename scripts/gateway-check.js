const net = require('net');
const host = '10.5.50.1';
const port = 80;

console.log(`\n[GATEWAY CHECK] Attempting to reach ${host} on Port ${port}...`);

const socket = new net.Socket();
socket.setTimeout(5000);

socket.on('connect', () => {
    console.log(`\n✅ SUCCESS! Node.js can see the router at ${host}.`);
    socket.destroy();
    process.exit(0);
});

socket.on('timeout', () => {
    console.log(`\n❌ TIMEOUT: Node.js cannot see ${host} on port ${port}.`);
    console.log(`   Your browser works, but Node.js is BLOCKED.`);
    socket.destroy();
    process.exit(1);
});

socket.on('error', (err) => {
    console.log(`\n❌ ERROR: ${err.code}`);
    socket.destroy();
    process.exit(1);
});

socket.connect(port, host);
