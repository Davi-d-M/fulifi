import { Buffer } from 'buffer';
import { prisma } from './prisma';
import {
    createLegacyVoucher,
    getLegacyActiveSessions,
    testLegacyConnection,
    terminateLegacySession,
    getLegacyResources,
    addLegacyVoucherTime
} from './mikrotik-legacy';

interface MikrotikConfig {
  host: string;
  port: number;
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
  let config: MikrotikConfig;

  if (siteId && siteId !== 'default-site') {
    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (site && site.routerHost) {
      const parts = site.routerHost.split(':');
      const host = parts[0];
      const port = parts[1] ? parseInt(parts[1]) : 8728;
      config = {
        host,
        port,
        username: site.routerUser || 'admin',
        password: site.routerPass || '',
        timeout: 15000
      };
    } else {
      // Fallback if site found but no host
      config = {
        host: '10.5.50.1',
        port: 80,
        username: process.env.MIKROTIK_USER || 'admin',
        password: process.env.MIKROTIK_PASSWORD || '',
        timeout: 15000,
      };
    }
  } else {
  // Default fallback to verified working router IP
    config = {
      host: '10.5.50.1',
      port: 80,
      username: process.env.MIKROTIK_USER || 'admin',
      password: process.env.MIKROTIK_PASSWORD || '',
      timeout: 20000,
    };
  }

  // Ensure default host if missing
  if (!config.host || config.host === '192.168.88.1') {
      config.host = '10.5.50.1';
  }

  console.log(`[MikroTik Config] Using ${config.host}:${config.port} (User: ${config.username})`);
  return config;
}

/**
 * Executes a command on MikroTik using the REST API (Port 80/443).
 * Requires RouterOS v7.1+.
 */
async function executeRestCommand(path: string, method: string = 'GET', body?: any, siteId?: string): Promise<any> {
    const config = await getMikrotikConfig(siteId);
    const protocol = config.port === 443 ? 'https' : 'http';
    const url = `${protocol}://${config.host}:${config.port}/rest${path}`;
    const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 404) {
                throw new Error(`MikroTik REST API Not Found (404). Ensure 'www' service is enabled and you are on RouterOS v7.1+. Tip: Try switching MIKROTIK_PORT to 8728 in .env.local to use the Legacy API instead.`);
            }
            throw new Error(`MikroTik REST Error (${response.status}): ${errorText || response.statusText}`);
        }

        return await response.json();
    } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') throw new Error("MikroTik REST API Timeout");
        throw e;
    }
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
  const profileName = getProfileName(packageId);
  const config = await getMikrotikConfig(siteId);

  if (!macAddress) {
      console.warn(`[MikroTik] Creating voucher ${voucherCode} without binding it to a MAC address.`);
  }

  // Calculate rate limit if not provided
  const finalRateLimit = rateLimit || '5M/5M';
  const finalBytesTotal = dataLimitMB ? dataLimitMB * 1024 * 1024 : 0;

  // If port is 80 or 443, use REST API
  if (config.port === 80 || config.port === 443) {
      try {
          console.log(`[MikroTik REST] Creating voucher ${voucherCode} on site ${siteId || 'default'}`);
          const body: any = {
              name: voucherCode,
              password: voucherCode,
              profile: profileName,
              server: 'hotspot1',
              comment: `Fulifi REST - ${new Date().toISOString()}`,
              'rate-limit': finalRateLimit
          };

          if (finalBytesTotal > 0) {
              body['limit-bytes-total'] = finalBytesTotal.toString();
          }

          if (durationMin) {
              const h = Math.floor(durationMin / 60);
              const m = durationMin % 60;
              body['limit-uptime'] = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
          }

          await executeRestCommand('/ip/hotspot/user', 'POST', body, siteId);
          return { success: true, voucherCode, profileName };
      } catch (e: any) {
          console.error("[MikroTik REST] Voucher Creation Error:", e.message);
          return { success: false, voucherCode, profileName, error: e.message };
      }
  }

  // Otherwise fallback to Legacy API
  const result = await createLegacyVoucher(
      voucherCode,
      profileName,
      siteId,
      durationMin,
      finalRateLimit,
      dataLimitMB
  );
  if (result.success) return { success: true, voucherCode, profileName };
  return { success: false, voucherCode, profileName, error: result.error };
}

async function terminateMikrotikSession(voucherCode: string, siteId?: string) {
  const config = await getMikrotikConfig(siteId);

  if (config.port === 80 || config.port === 443) {
      try {
          // Remove active session
          const active = await executeRestCommand('/ip/hotspot/active', 'GET', undefined, siteId);
          const sessions = active.filter((s: any) => s.user === voucherCode);
          for (const s of sessions) {
              await executeRestCommand(`/ip/hotspot/active/${s['.id']}`, 'DELETE', undefined, siteId);
          }
          // Remove user
          const users = await executeRestCommand('/ip/hotspot/user', 'GET', undefined, siteId);
          const matchedUsers = users.filter((u: any) => u.name === voucherCode);
          for (const u of matchedUsers) {
              await executeRestCommand(`/ip/hotspot/user/${u['.id']}`, 'DELETE', undefined, siteId);
          }
          return { success: true };
      } catch (e: any) {
          return { success: false, error: e.message };
      }
  }

  return await terminateLegacySession(voucherCode, siteId);
}

async function testMikrotikConnection(siteId?: string) {
  const config = await getMikrotikConfig(siteId);

  console.log(`[MikroTik] Diagnostic check to ${config.host}:${config.port} (Site: ${siteId || 'default'})`);

  if (config.port === 80 || config.port === 443) {
      try {
          const data = await executeRestCommand('/system/identity', 'GET', undefined, siteId);
          return { success: true, message: `Connected to MikroTik (REST): ${data.name}` };
      } catch (e: any) {
          console.error(`[MikroTik REST] Connection failed: ${e.message}`);
          return { success: false, message: `REST Connection Failed: ${e.message}`, error: e.message };
      }
  }

  try {
    const result = await testLegacyConnection(siteId);
    if (result.success) {
      return { success: true, message: `Connected to MikroTik (Legacy): ${result.name}` };
    }
    console.error(`[MikroTik Legacy] Connection failed: ${result.error}`);
    return { success: false, message: `Legacy Connection Failed: ${result.error}`, error: result.error };
  } catch (e: any) {
    console.error(`[MikroTik Legacy] Fatal error: ${e.message}`);
    return { success: false, message: `Legacy Fatal Error: ${e.message}`, error: e.message };
  }
}

async function getMikrotikActiveSessions(siteId?: string) {
  const config = await getMikrotikConfig(siteId);

  if (config.port === 80 || config.port === 443) {
      try {
          const data = await executeRestCommand('/ip/hotspot/active', 'GET', undefined, siteId);
          return data.map((item: any) => ({
              '.id': item['.id'],
              user: item.user,
              address: item.address,
              uptime: item.uptime,
              'mac-address': item['mac-address'],
              'bytes-in': item['bytes-in'],
              'bytes-out': item['bytes-out']
          }));
      } catch (e) { return []; }
  }

  return await getLegacyActiveSessions(siteId);
}

async function getMikrotikResources(siteId?: string) {
  const config = await getMikrotikConfig(siteId);

  if (config.port === 80 || config.port === 443) {
      try {
          const [resources, identity] = await Promise.all([
              executeRestCommand('/system/resource', 'GET', undefined, siteId),
              executeRestCommand('/system/identity', 'GET', undefined, siteId)
          ]);

          return {
              ...(Array.isArray(resources) ? resources[0] : resources),
              name: identity?.name || "MikroTik"
          };
      } catch (e) {
          console.error(`[MikroTik REST] Resource fetch failed: ${e.message}`);
          return null;
      }
  }

  try {
      const data = await getLegacyResources(siteId);
      return data || null;
  } catch (e) {
      return null;
  }
}

async function addVoucherTime(voucherCode: string, minutes: number, siteId?: string) {
  const config = await getMikrotikConfig(siteId);

  if (config.port === 80 || config.port === 443) {
      try {
          const users = await executeRestCommand('/ip/hotspot/user', 'GET', undefined, siteId);
          const user = users.find((u: any) => u.name === voucherCode);
          if (user) {
              const currentLimit = user['limit-uptime'] || "00:00:00";
              const parts = currentLimit.split(':').map(Number);
              let totalSeconds = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
              totalSeconds += (minutes * 60);
              const h = Math.floor(totalSeconds / 3600);
              const m = Math.floor((totalSeconds % 3600) / 60);
              const s = totalSeconds % 60;
              const newLimit = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
              await executeRestCommand(`/ip/hotspot/user/${user['.id']}`, 'PATCH', { 'limit-uptime': newLimit }, siteId);
              return { success: true };
          }
          return { success: false, error: "User not found" };
      } catch (e: any) { return { success: false, error: e.message }; }
  }

  return await addLegacyVoucherTime(voucherCode, minutes, siteId);
}

// These are secondary/optional for now
async function getMikrotikInterfaces(siteId?: string) { return []; }
async function pingDeviceFromRouter(address: string, siteId?: string) { return { alive: false }; }
async function getMikrotikExport(siteId?: string) { return null; }
async function scanForRogueAPs(siteId?: string) { return []; }
async function banMikrotikDevice(macAddress: string, voucherCode: string, siteId?: string) { return { success: false, message: "Not implemented in legacy" }; }
async function setTetheringBlock(enabled: boolean, siteId?: string) { return { success: false, message: "Not implemented in legacy" }; }
async function activateHotspotSession(mac: string, ip: string, code: string, siteId?: string) {
  const config = await getMikrotikConfig(siteId);

  if (config.port === 80 || config.port === 443) {
      try {
          console.log(`[MikroTik REST] Activating session for MAC: ${mac}, IP: ${ip}, User: ${code}`);
          // Attempt to login via REST (if supported/configured in some setups)
          // Note: Most Hotspots require the client to POST to /login.
          // However, we can use the API to "active" a user if we have their details.
          // Another way is to add them to /ip/hotspot/active directly if the router allows it via API.

          const body = {
              user: code,
              'mac-address': mac,
              address: ip,
              server: 'hotspot1'
          };

          await executeRestCommand('/ip/hotspot/active', 'POST', body, siteId);
          return { success: true, message: "Session activated via REST" };
      } catch (e: any) {
          console.error(`[MikroTik REST] Activation failed: ${e.message}`);
          return { success: false, message: e.message };
      }
  }

  return { success: false, message: "Manual activation not implemented for Legacy API" };
}

export {
  createMikrotikVoucher,
  testMikrotikConnection,
  terminateMikrotikSession,
  getMikrotikConfig,
  getProfileName,
  getMikrotikActiveSessions,
  getMikrotikResources,
  getMikrotikInterfaces,
  pingDeviceFromRouter,
  getMikrotikExport,
  scanForRogueAPs,
  addVoucherTime,
  banMikrotikDevice,
  setTetheringBlock,
  activateHotspotSession
};
export type { MikrotikConfig, VoucherCreationResult };
