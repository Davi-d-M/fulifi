import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId') || 'default-site';

    // 1. Get recent visitor profiles (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const visitorCount = await prisma.deviceProfile.count({
      where: {
        siteId,
        lastSeen: { gte: twentyFourHoursAgo }
      }
    });

    // 2. Get active alerts
    const activeAlerts = await prisma.securityAlert.count({
      where: { siteId, isResolved: false }
    });

    return NextResponse.json({
      visitors: visitorCount,
      activeAlerts: activeAlerts,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
