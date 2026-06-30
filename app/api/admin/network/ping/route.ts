import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pingDeviceFromRouter } from '@/lib/mikrotik';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || 'default-site';

    // Perform a live ping to a stable target (Google DNS)
    const result: any = await pingDeviceFromRouter('8.8.8.8', siteId);

    if (result.alive && result.avgRtt) {
        const ms = parseInt(result.avgRtt.replace('ms', ''));
        // Save to performance logs
        await prisma.performanceLog.create({
            data: {
                siteId,
                downloadSpeed: 0, // Ping check only
                uploadSpeed: 0,
                latency: ms,
                provider: "ISP Watchdog",
            }
        });
    }

    // Return last 20 logs for the chart
    const logs = await prisma.performanceLog.findMany({
        where: { siteId },
        orderBy: { timestamp: 'desc' },
        take: 20
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
