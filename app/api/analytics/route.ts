import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/analytics
 * Get revenue and usage analytics
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'today';
    const siteId = searchParams.get('siteId') || 'default-site';

    const now = new Date();
    let startDate = new Date();

    if (action === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (action === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (action === 'month') {
      startDate.setDate(now.getDate() - 30);
    }

    const payments = await prisma.payment.findMany({
      where: {
        siteId,
        createdAt: { gte: startDate },
        status: 'active',
      },
      include: { offer: true },
    });

    const connections = await prisma.deviceConnection.findMany({
      where: {
        siteId,
        connectedAt: { gte: startDate },
      },
    });

    const activeUsers = await prisma.deviceConnection.count({
      where: {
        siteId,
        status: 'CONNECTED',
        disconnectedAt: null,
      },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const avgSessionDuration = connections.length > 0
      ? Math.round(
          connections.reduce((sum, c) => sum + (c.sessionDuration || 0), 0) / connections.length
        )
      : 0;

    console.log(`[Analytics] Generated ${action} report`);

    return NextResponse.json({
      success: true,
      period: action,
      metrics: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalSessions: connections.length,
        uniqueDevices: new Set(connections.map(c => c.macAddress)).size,
        activeUsers,
        averageSessionDuration: avgSessionDuration,
      },
      dateRange: { start: startDate, end: now },
    });
  } catch (error: any) {
    console.error('[Analytics] Error:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
