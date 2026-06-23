const net = require('net');
const host = '192.168.88.1';
const ports = [80, 8728];

console.log(`\n[Diagnostic] Starting connection test to ${host}...\n`);

ports.forEach(port => {
    const socket = new net.Socket();
    const startTime = Date.now();

    socket.setTimeout(5000);

    socket.on('connect', () => {
        console.log(`✅ PORT ${port}: OPEN (Connected in ${Date.now() - startTime}ms)`);
        socket.destroy();
    });

    socket.on('timeout', () => {
        console.log(`❌ PORT ${port}: TIMEOUT (No response in 5 seconds)`);
        socket.destroy();
    });

    socket.on('error', (err) => {
        console.log(`❌ PORT ${port}: CLOSED (${err.code})`);
        socket.destroy();
    });

    socket.connect(port, host);
});
