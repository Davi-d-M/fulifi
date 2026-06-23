import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const sites = await prisma.site.findMany();

    const siteStats = await Promise.all(sites.map(async (site) => {
      const revenue = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: { siteId: site.id, status: 'SUCCESS' }
      });

      const activeUsers = await prisma.activeSession.count({
        where: { siteId: site.id, expiresAt: { gt: new Date() } }
      });

      return {
        id: site.id,
        name: site.name,
        revenue: revenue._sum.amount || 0,
        activeUsers
      };
    }));

    // Calculate totals
    const totalRevenue = siteStats.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalActive = siteStats.reduce((acc, curr) => acc + curr.activeUsers, 0);

    return NextResponse.json({
      sites: siteStats,
      totalRevenue,
      totalActive
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
