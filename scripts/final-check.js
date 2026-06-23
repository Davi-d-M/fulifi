const net = require('net');
const host = '192.168.88.1';
const port = 8728; // Using the most stable API port

console.log(`\n[FINAL CHECK] Attempting to reach ${host} on Port ${port}...`);

const socket = new net.Socket();
socket.setTimeout(5000);

socket.on('connect', () => {
    console.log(`\n✅ SUCCESS! Node.js can see the router.`);
    console.log(`   This means the app is ready to work.`);
    socket.destroy();
    process.exit(0);
});

socket.on('timeout', () => {
    console.log(`\n❌ TIMEOUT: The router is not responding to Node.js.`);
    console.log(`   CAUSE: Windows Firewall, Antivirus, or your Network is set to "Public".`);
    socket.destroy();
    process.exit(1);
});

socket.on('error', (err) => {
    console.log(`\n❌ ERROR: ${err.code}`);
    console.log(`   If "ECONNREFUSED", the service is disabled in WinBox.`);
    socket.destroy();
    process.exit(1);
});

socket.connect(port, host);
