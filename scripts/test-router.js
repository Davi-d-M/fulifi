const { RouterOSClient } = require('routeros-client');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local to avoid dependency issues
function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let value = match[2] || '';
            if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            env[match[1]] = value;
        }
    });
    return env;
}

async function main() {
  const env = loadEnv();
  console.log("📡 Testing MikroTik Router Connectivity...");

  const host = env.MIKROTIK_HOST || '127.0.0.1';
  const port = parseInt(env.MIKROTIK_PORT || '8728');
  const user = env.MIKROTIK_USER || 'admin';
  const password = env.MIKROTIK_PASSWORD || '';

  console.log(`Target: ${host}:${port}`);
  console.log(`User: ${user}`);
  console.log("-----------------------------------");

  const client = new RouterOSClient({
    host: host,
    user: user,
    password: password,
    port: port,
    keepalive: false,
    timeout: 10
  });

  try {
    const api = await client.connect();
    console.log("✅ SUCCESS: Successfully logged into your MikroTik Router!");

    const identity = await api.menu('/system/identity').get();
    console.log(`Router Identity: ${identity[0].name}`);

    await api.close();
    console.log("-----------------------------------");
    console.log("Your router is 100% CONNECTED and ready for production.");
  } catch (err) {
    console.error("❌ FAILURE: Could not connect to the router.");
    console.error("Error Detail:", err.message);
    console.log("-----------------------------------");
    console.log("CHECKLIST:");
    console.log("1. Is your ngrok TCP tunnel window still open?");
    console.log(`2. Does MIKROTIK_PORT (${port}) match the port in your ngrok window?`);
    console.log("3. Is the MikroTik 'api' service enabled (Winbox -> IP -> Services)?");
  }
}

main();
