import { Buffer } from 'buffer';
import { prisma } from './prisma';

interface MikrotikConfig {
  host: string;
  username: string;
  password: string;
  timeout: number;
}

interface VoucherCreationResult {
  success: boolean;
  voucherCode: string;
  profileName: string;
  error?: string;
}

async function getMikrotikConfig(siteId?: string): Promise<MikrotikConfig> {
  // If siteId is provided, try to load from DB
  if (siteId && siteId !== 'default-site') {
    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (site && site.routerHost) {
      return {
        host: site.routerHost,
        username: site.routerUser || 'admin',
        password: site.routerPass || '',
        timeout: 15000
      };
    }
  }

  // Fallback to env vars
  const host = process.env.MIKROTIK_HOST || '192.168.88.1';
  let port = process.env.MIKROTIK_PORT || '80';

  if (port === '8728' || port === '8729') {
    port = '80';
  }

  const finalHost = host.includes(':') ? host : `${host}:${port}`;

  return {
    host: finalHost,
    username: process.env.MIKROTIK_USER || 'admin',
    password: process.env.MIKROTIK_PASSWORD || '',
    timeout: parseInt(process.env.MIKROTIK_TIMEOUT || '15000', 10),
  };
}

function getProfileName(packageId: string): string {
  const profileMap: Record<string, string> = {
    '1hr': '1-Hour-Pass',
    '24hr': '24-Hour-Pass',
    '7day': '7-Day-Pass',
    'offer_1hr': '1-Hour-Pass',
    'offer_3hr': '3-Hour-Pass',
    'offer_netflix': 'Netflix-Special',
    'offer_work': 'Work-Mode-Pass',
    'offer_night': '6-Hour-Pass',
    'offer_midnight_oil': 'Midnight-Oil-Pass',
    'offer_weekend': '48-Hour-Pass',
  };

  return profileMap[packageId] || '1-Hour-Pass';
}

/**
 * Creates a Hotspot user on the MikroTik router.
 */
async function createMikrotikVoucher(
  voucherCode: string,
  packageId: string,
  durationMin?: number,
  expiryMode?: string,
  macAddress?: string,
  rateLimit?: string,
  dataLimitMB?: number,
  burstLimit?: string,
  burstThreshold?: string,
  burstTime?: string,
  siteId?: string
): Promise<VoucherCreationResult> {
  const config = await getMikrotikConfig(siteId);
  const profileName = getProfileName(packageId);
  const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');

  let formattedTime = "";
  if (durationMin) {
    const hours = Math.floor(durationMin / 60);
    const mins = durationMin % 60;
    formattedTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
  }

  // Handle Rate Limits (rate/burst-rate/burst-threshold/burst-time)
  let fullRateLimit = rateLimit || "";
  if (burstLimit && burstThreshold && burstTime) {
    fullRateLimit = `${rateLimit} ${burstLimit} ${burstThreshold} ${burstTime}`;
  }

  const payload: any = {
    server: process.env.MIKROTIK_HOTSPOT_NAME || 'hotspot1',
    name: voucherCode,
    password: voucherCode,
    profile: profileName,
    comment: `Starlinknet.WIFI - ${new Date().toISOString()}`,
  };

  if (macAddress) payload['mac-address'] = macAddress;
  if (fullRateLimit) payload['rate-limit'] = fullRateLimit;
  if (dataLimitMB && dataLimitMB > 0) {
    payload['limit-bytes-total'] = String(dataLimitMB * 1024 * 1024);
  }

  if (formattedTime) {
    if (expiryMode === "CONTINUOUS") {
      payload['limit-uptime'] = formattedTime;
    } else if (expiryMode === "ACTIVE_ONLY") {
      payload['session-timeout'] = formattedTime;
    }
  }

  try {
    const response = await fetch(`http://${config.host}/rest/ip/hotspot/user/add`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Router Error: ${errorText}`);
    }

    return { success: true, voucherCode, profileName };
  } catch (error: any) {
    console.error(`[MikroTik] Voucher Creation Failed:`, error.message);
    return { success: false, voucherCode, profileName, error: error.message };
  }
}

async function terminateMikrotikSession(voucherCode: string, siteId?: string): Promise<{ success: boolean; message: string }> {
  const config = await getMikrotikConfig(siteId);
  const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');

  try {
    const findResponse = await fetch(`http://${config.host}/rest/ip/hotspot/active?user=${voucherCode}`, {
      method: 'GET',
      headers: { 'Authorization': authHeader },
    });

    if (findResponse.ok) {
      const activeSessions = await findResponse.json();
      for (const session of activeSessions) {
        await fetch(`http://${config.host}/rest/ip/hotspot/active/remove`, {
          method: 'POST',
          headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ '.id': session['.id'] }),
        });
      }
    }

    const userFindResponse = await fetch(`http://${config.host}/rest/ip/hotspot/user?name=${voucherCode}`, {
      method: 'GET',
      headers: { 'Authorization': authHeader },
    });

    if (userFindResponse.ok) {
      const users = await userFindResponse.json();
      for (const user of users) {
        await fetch(`http://${config.host}/rest/ip/hotspot/user/remove`, {
          method: 'POST',
          headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ '.id': user['.id'] }),
        });
      }
    }

    return { success: true, message: `Successfully terminated user ${voucherCode}` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

async function checkMikrotikUserExists(voucherCode: string, siteId?: string): Promise<boolean> {
  const config = await getMikrotikConfig(siteId);
  const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');

  try {
    const response = await fetch(`http://${config.host}/rest/ip/hotspot/user?name=${voucherCode}`, {
      method: 'GET',
      headers: { 'Authorization': authHeader },
    });

    if (response.ok) {
      const users = await response.json();
      return Array.isArray(users) && users.length > 0;
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function testMikrotikConnection(siteId?: string): Promise<{ success: boolean; message: string }> {
  const config = await getMikrotikConfig(siteId);
  const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');

  try {
    const response = await fetch(`http://${config.host}/rest/system/identity`, {
      method: 'GET',
      headers: { 'Authorization': authHeader },
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, message: `Connected to MikroTik: ${data.name}` };
    } else {
      throw new Error(`Router status ${response.status}`);
    }
  } catch (error: any) {
    return { success: false, message: `Failed: ${error.message}` };
  }
}

async function getMikrotikActiveSessions(siteId?: string): Promise<any[]> {
  const config = await getMikrotikConfig(siteId);
  const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');

  try {
    const response = await fetch(`http://${config.host}/rest/ip/hotspot/active?.proplist=.id,user,address,uptime,bytes-in,bytes-out,mac-address`, {
      method: 'GET',
      headers: { 'Authorization': authHeader },
    });

    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
    return [];
  } catch (error: any) {
    return [];
  }
}

async function activateHotspotSession(macAddress: string, ipAddress: string, voucherCode: string, siteId?: string): Promise<{ success: boolean; message: string }> {
  const config = await getMikrotikConfig(siteId);
  const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');

  try {
    const response = await fetch(`http://${config.host}/rest/ip/hotspot/active/add`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: voucherCode,
        'mac-address': macAddress,
        address: ipAddress,
        server: process.env.MIKROTIK_HOTSPOT_NAME || 'hotspot1'
      }),
    });

    if (response.ok) {
      return { success: true, message: "Live session injected" };
    } else {
      const errorText = await response.text();
      return { success: false, message: `Injection failed: ${errorText}` };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

async function getMikrotikResources(siteId?: string): Promise<any> {
  const config = await getMikrotikConfig(siteId);
  const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');

  try {
    const res = await fetch(`http://${config.host}/rest/system/resource`, {
      method: 'GET',
      headers: { 'Authorization': authHeader },
    });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data[0] : data;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function getMikrotikInterfaces(siteId?: string): Promise<any[]> {
  const config = await getMikrotikConfig(siteId);
  const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');

  try {
    const res = await fetch(`http://${config.host}/rest/interface`, {
      method: 'GET',
      headers: { 'Authorization': authHeader },
    });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
    return [];
  } catch (e) {
    return [];
  }
}

async function pingDeviceFromRouter(address: string, siteId?: string): Promise<{ alive: boolean; avgRtt?: string }> {
  const config = await getMikrotikConfig(siteId);
  const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');

  try {
    const res = await fetch(`http://${config.host}/rest/ping`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        count: 3
      }),
    });
    if (res.ok) {
      const data = await res.json();
      // MikroTik returns an array of ping results
      const received = data.filter((p: any) => p.received > 0 || p.status === 'received');
      if (received.length > 0) {
          const avgRtt = data[0]['avg-rtt'] || data[0].time;
          return { alive: true, avgRtt };
      }
    }
    return { alive: false };
  } catch (e) {
    return { alive: false };
  }
}

async function addVoucherTime(voucherCode: string, minutes: number, siteId?: string): Promise<{ success: boolean; message: string }> {
  const config = await getMikrotikConfig(siteId);
  const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');

  try {
    // 1. Find user
    const findRes = await fetch(`http://${config.host}/rest/ip/hotspot/user?name=${voucherCode}`, {
      method: 'GET',
      headers: { 'Authorization': authHeader },
    });

    if (findRes.ok) {
      const users = await findRes.json();
      if (users.length > 0) {
        const user = users[0];
        const currentLimit = user['limit-uptime'] || "00:00:00";
        // Simple add logic - converting to seconds then back
        const parts = currentLimit.split(':').map(Number);
        let totalSeconds = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
        totalSeconds += (minutes * 60);

        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        const newLimit = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

        await fetch(`http://${config.host}/rest/ip/hotspot/user/set`, {
          method: 'POST',
          headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ '.id': user['.id'], 'limit-uptime': newLimit }),
        });

        return { success: true, message: `Added ${minutes}m. New limit: ${newLimit}` };
      }
    }
    return { success: false, message: "User not found on router" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

async function getMikrotikExport(siteId?: string): Promise<string | null> {
  const config = await getMikrotikConfig(siteId);
  const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');

  try {
    // MikroTik REST API doesn't have a direct /export endpoint easily accessible via GET that returns the text
    // Usually, we trigger an export to a file, then download the file.
    const filename = `cloud_backup_${Date.now()}.rsc`;
    const exportRes = await fetch(`http://${config.host}/rest/execute`, {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ script: `/export file=${filename} compact` }),
    });

    if (exportRes.ok) {
        // Wait a bit for the file to be generated
        await new Promise(r => setTimeout(r, 2000));
        const fileRes = await fetch(`http://${config.host}/rest/file?name=${filename}`, {
            method: 'GET',
            headers: { 'Authorization': authHeader },
        });
        if (fileRes.ok) {
            const data = await fileRes.json();
            return data.contents || null;
        }
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function scanForRogueAPs(siteId?: string): Promise<any[]> {
    const config = await getMikrotikConfig(siteId);
    const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');

    try {
        // This requires the wireless interface to be in a state that allows scanning
        // Typically we'd use /interface/wireless/scan but REST API behavior varies by version
        const res = await fetch(`http://${config.host}/rest/interface/wireless/scan`, {
            method: 'POST',
            headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ '.id': 'wlan1', duration: '5s' }),
        });
        if (res.ok) {
            return await res.json();
        }
        return [];
    } catch (e) {
        return [];
    }
}

async function banMikrotikDevice(macAddress: string, voucherCode: string, siteId?: string): Promise<{ success: boolean; message: string }> {
  const config = await getMikrotikConfig(siteId);
  const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');

  try {
    // 1. Kick current session
    await terminateMikrotikSession(voucherCode, siteId).catch(() => {});

    // 2. Add to IP Bindings as 'blocked'
    const response = await fetch(`http://${config.host}/rest/ip/hotspot/ip-binding/add`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'mac-address': macAddress,
        type: 'blocked',
        comment: `BANNED: Used voucher ${voucherCode} - ${new Date().toISOString()}`
      }),
    });

    if (response.ok) {
      return { success: true, message: `Device ${macAddress} has been blacklisted.` };
    } else {
      const errorText = await response.text();
      return { success: false, message: `Router Error: ${errorText}` };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

async function setTetheringBlock(enabled: boolean, siteId?: string): Promise<{ success: boolean; message: string }> {
  const config = await getMikrotikConfig(siteId);
  const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');

  try {
    const comment = "BLOCK_TETHERING_AUTO";
    const findRes = await fetch(`http://${config.host}/rest/ip/firewall/mangle?comment=${comment}`, {
      method: 'GET',
      headers: { 'Authorization': authHeader },
    });

    const rules = await findRes.json();

    if (enabled) {
      if (!Array.isArray(rules) || rules.length === 0) {
        await fetch(`http://${config.host}/rest/ip/firewall/mangle/add`, {
          method: 'POST',
          headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chain: 'postrouting',
            action: 'change-ttl',
            'new-ttl': 'set:1',
            comment: comment
          }),
        });
      }
    } else {
      if (Array.isArray(rules)) {
        for (const rule of rules) {
          await fetch(`http://${config.host}/rest/ip/firewall/mangle/remove`, {
            method: 'POST',
            headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ '.id': rule['.id'] }),
          });
        }
      }
    }

    return { success: true, message: `Tethering block ${enabled ? 'enabled' : 'disabled'}` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export {
  activateHotspotSession,
  createMikrotikVoucher,
  testMikrotikConnection,
  terminateMikrotikSession,
  getMikrotikConfig,
  getProfileName,
  checkMikrotikUserExists,
  getMikrotikActiveSessions,
  getMikrotikResources,
  getMikrotikInterfaces,
  pingDeviceFromRouter,
  getMikrotikExport,
  scanForRogueAPs,
  addVoucherTime,
  banMikrotikDevice,
  setTetheringBlock
};
