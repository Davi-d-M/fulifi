import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMikrotikTraffic } from '@/lib/mikrotik';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || 'default-site';

    // 1. Fetch live traffic from MikroTik (ether1 is usually WAN)
    const traffic = await getMikrotikTraffic(siteId, 'ether1');

    if (traffic) {
        // Convert to Mbps (router returns bps)
        const rxMbps = (parseInt(traffic['rx-bits-per-second']) / 1000000).toFixed(2);
        const txMbps = (parseInt(traffic['tx-bits-per-second']) / 1000000).toFixed(2);

        // 2. Save log for history
        await prisma.speedTest.create({
          data: {
            download: parseFloat(rxMbps),
            upload: parseFloat(txMbps),
            ping: 0, // Ping is tracked in a separate route
            isp: "MikroTik Live Monitor"
          }
        });
    }

    const logs = await prisma.speedTest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
    // Keep POST for manual trigger compatibility, same logic as GET
    return GET({} as any);
}
