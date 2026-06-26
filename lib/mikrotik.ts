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
  // 1. Default values from environment
  let config: MikrotikConfig = {
    host: process.env.MIKROTIK_HOST || '192.168.88.1',
    port: parseInt(process.env.MIKROTIK_PORT || '8728'),
    username: process.env.MIKROTIK_USER || 'admin',
    password: process.env.MIKROTIK_PASSWORD || '',
    timeout: 15000,
  };

  // 2. Override with site-specific settings if available
  if (siteId && siteId !== 'default-site') {
    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (site && site.routerHost) {
      config.host = site.routerHost;
      config.username = site.routerUser || 'admin';
      config.password = site.routerPass || '';
    }
  }

  return config;
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
  const result = await createLegacyVoucher(voucherCode, profileName, siteId);
  if (result.success) return { success: true, voucherCode, profileName };
  return { success: false, voucherCode, profileName, error: result.error };
}

async function terminateMikrotikSession(voucherCode: string, siteId?: string) {
  return await terminateLegacySession(voucherCode, siteId);
}

async function testMikrotikConnection(siteId?: string) {
  const result = await testLegacyConnection(siteId);
  if (result.success) return { success: true, message: `Connected to MikroTik: ${result.name}`, name: result.name };
  return { success: false, message: `Legacy Connection Failed: ${result.error}`, error: result.error };
}

async function getMikrotikActiveSessions(siteId?: string) {
  return await getLegacyActiveSessions(siteId);
}

async function getMikrotikResources(siteId?: string) {
  return await getLegacyResources(siteId);
}

async function addVoucherTime(voucherCode: string, minutes: number, siteId?: string) {
  return await addLegacyVoucherTime(voucherCode, minutes, siteId);
}

// Stubs for functions not yet ported to legacy
async function getMikrotikInterfaces(siteId?: string) { return []; }
async function pingDeviceFromRouter(address: string, siteId?: string) { return { alive: false }; }
async function getMikrotikExport(siteId?: string) { return null; }
async function scanForRogueAPs(siteId?: string) { return []; }
async function banMikrotikDevice(macAddress: string, voucherCode: string, siteId?: string) { return { success: false, message: "Not implemented in legacy" }; }
async function setTetheringBlock(enabled: boolean, siteId?: string) { return { success: false, message: "Not implemented in legacy" }; }
async function activateHotspotSession(mac: string, ip: string, code: string, siteId?: string) { return { success: false, message: "Manual activation not implemented in legacy" }; }

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
