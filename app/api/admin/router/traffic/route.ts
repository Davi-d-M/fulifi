import { NextRequest, NextResponse } from 'next/server';
import { getMikrotikTraffic } from '@/lib/mikrotik';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || 'default-site';
    const interfaceName = searchParams.get('interface') || 'ether1';

    const traffic = await getMikrotikTraffic(siteId, interfaceName);

    if (traffic) {
      return NextResponse.json({
        rx: parseInt(traffic['rx-bits-per-second'] || '0'),
        tx: parseInt(traffic['tx-bits-per-second'] || '0'),
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ rx: 0, tx: 0, error: "Router unreachable" }, { status: 502 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
