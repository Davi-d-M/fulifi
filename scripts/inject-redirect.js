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
  const host = env.MIKROTIK_HOST || '127.0.0.1';
  const port = parseInt(env.MIKROTIK_PORT || '8728');
  const user = env.MIKROTIK_USER || 'admin';
  const password = env.MIKROTIK_PASSWORD || '';
  const portalUrl = "https://oil-cinnamon-starfish.ngrok-free.dev";

  console.log(`📡 Connecting to MikroTik at ${host}:${port}...`);

  const client = new RouterOSClient({
    host: host,
    user: user,
    password: password,
    port: port,
    timeout: 10
  });

  try {
    const api = await client.connect();
    console.log("✅ Logged in!");

    const loginHtml = `<html><head><meta http-equiv="refresh" content="0;url=${portalUrl}?mac=\$(mac)&ip=\$(ip)&siteId=\$(identity)"></head><body onload="window.location.replace('${portalUrl}?mac=\$(mac)&ip=\$(ip)&siteId=\$(identity)')"></body></html>`;

    console.log("🚀 Injecting redirect file...");

    // Create hotspot directory if it doesn't exist
    await api.menu('/file').print({ '.proplist': ['name'], 'query': { 'name': 'hotspot' } });

    // Use the raw terminal command to create the file
    // We escape the double quotes for the content
    const escapedContent = loginHtml.replace(/"/g, '\\"');
    await api.menu('/').exec(`file print file=hotspot/login.html; :delay 2s; file set hotspot/login.html contents="${escapedContent}"`);

    console.log("✅ Redirect file created in hotspot/login.html");

    console.log("🔧 Configuring Hotspot Profile...");
    await api.menu('/ip/hotspot/profile').set({
        'numbers': 'default',
        'html-directory': 'hotspot',
        'login-by': 'http-pap,mac-cookie'
    });

    console.log("✅ Hotspot configured for auto-redirect.");

    await api.close();
    console.log("-----------------------------------");
    console.log("DONE! The billing portal will now pop up automatically on all devices.");
  } catch (err) {
    console.error("❌ ERROR:", err.message);
  }
}

main();
