import { NextRequest, NextResponse } from 'next/server';
import { getMikrotikInterfaces, pingDeviceFromRouter } from '@/lib/mikrotik';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || 'default-site';
    const interfaces = await getMikrotikInterfaces(siteId);

    // Peripheral devices to monitor - in a real app these could be in DB
    const peripherals = [
      { name: 'Fiber Gateway', ip: '192.168.1.1' },
      { name: 'Core Switch', ip: '192.168.88.2' },
      { name: 'Access Point East', ip: '192.168.88.10' }
    ];

    const pingResults = await Promise.all(
      peripherals.map(async (p) => {
        const result = await pingDeviceFromRouter(p.ip, siteId);
        return { ...p, ...result };
      })
    );

    // Find WAN interface (usually ether1 or sfp-sfpplus1 in Starlink/Fiber setups)
    const wanInterface = interfaces.find(i =>
      i.name.toLowerCase().includes('ether1') ||
      i.name.toLowerCase().includes('wan') ||
      i.name.toLowerCase().includes('sfp')
    );

    return NextResponse.json({
      interfaces,
      wanStats: wanInterface ? {
        name: wanInterface.name,
        rx: wanInterface['rx-byte'],
        tx: wanInterface['tx-byte'],
        rxRate: wanInterface['rx-bits-per-second'],
        txRate: wanInterface['tx-bits-per-second']
      } : null,
      peripherals: pingResults
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
