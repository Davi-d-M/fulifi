import { NextRequest, NextResponse } from 'next/server';
import { prisma, prismaRetry } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || 'default-site';

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Calculate Total Revenue
    let totalRevenue = 0;
    let transactionCount = 0;
    try {
        const revenueAggregation = await prismaRetry(() => prisma.payment.aggregate({
          _sum: { amount: true },
          _count: { id: true },
          where: { siteId, status: 'active' }
        }));
        totalRevenue = revenueAggregation._sum.amount || 0;
        transactionCount = revenueAggregation._count.id || 0;
    } catch (e) {}

    // 2. Fetch daily breakdown
    let dailyStats: Record<string, number> = {};
    try {
        const lastMonthPayments = await prismaRetry(() => prisma.payment.findMany({
          where: {
            siteId,
            status: 'active',
            createdAt: { gte: thirtyDaysAgo }
          },
          select: { amount: true, createdAt: true }
        }));

        dailyStats = lastMonthPayments.reduce((acc: Record<string, number>, curr) => {
          const date = curr.createdAt.toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + curr.amount;
          return acc;
        }, {});
    } catch (e) {}

    // 3. Earnings per package breakdown
    let breakdown: any[] = [];
    try {
        const packageEarnings = await prismaRetry(() => prisma.payment.groupBy({
          by: ['offerId'],
          where: { siteId, status: 'active' },
          _sum: { amount: true },
          _count: { id: true }
        }));

        const offers = await prismaRetry(() => prisma.voucherOffer.findMany({
          where: { siteId },
          select: { id: true, name: true }
        }));

        breakdown = packageEarnings.map(item => {
          const offer = offers.find(o => o.id === item.offerId);
          return {
            packageName: offer?.name || "Other/System",
            totalEarned: item._sum.amount || 0,
            unitsSold: item._count.id || 0
          };
        });
    } catch (e) {}

    // 4. Recent events
    let recentEvents: any[] = [];
    try {
        recentEvents = await prisma.paymentEvent.findMany({
          where: { siteId },
          orderBy: { createdAt: 'desc' },
          take: 5
        });
    } catch (e) {}

    return NextResponse.json({
      totalRevenue,
      transactionCount,
      dailyStats,
      packageBreakdown: breakdown,
      recentTransactions: recentEvents
    });

  } catch (error: any) {
    console.error("Revenue Analytics API Error:", error.message);
    return NextResponse.json({
        totalRevenue: 0,
        transactionCount: 0,
        dailyStats: {},
        packageBreakdown: [],
        recentTransactions: [],
        error: "Analytics currently unavailable."
    });
  }
}
