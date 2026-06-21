import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || 'default-site';

    const p = prisma as any;
    if (!p.payment || !p.voucherOffer || !p.paymentEvent) {
        return NextResponse.json({
            totalRevenue: 0,
            transactionCount: 0,
            dailyStats: {},
            packageBreakdown: [],
            recentTransactions: [],
            warning: "Database models not generated. Please run 'npx prisma generate'."
        });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Calculate Total Revenue using optimized SQL aggregation
    const revenueAggregation = await prisma.payment.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: { siteId }
    });

    const totalRevenue = revenueAggregation._sum.amount || 0;
    const transactionCount = revenueAggregation._count.id || 0;

    // 2. Fetch daily breakdown (Limited to 30 days)
    const lastMonthPayments = await prisma.payment.findMany({
      where: {
        siteId,
        createdAt: { gte: thirtyDaysAgo }
      },
      select: { amount: true, createdAt: true }
    });

    // Aggregate by day
    const dailyStats = lastMonthPayments.reduce((acc: Record<string, number>, curr) => {
      const date = curr.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + curr.amount;
      return acc;
    }, {});

    // 3. Earnings per package breakdown
    const packageEarnings = await prisma.payment.groupBy({
      by: ['offerId'],
      where: { siteId },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    // Fetch offer names for the breakdown
    const offers = await prisma.voucherOffer.findMany({
      where: { siteId },
      select: { id: true, name: true }
    });

    const breakdown = packageEarnings.map(item => {
      const offer = offers.find(o => o.id === item.offerId);
      return {
        packageName: offer?.name || "Other/System",
        totalEarned: item._sum.amount || 0,
        unitsSold: item._count.id || 0
      };
    });

    // 4. Recent transactions for audit feed (Paystack logs)
    const recentEvents = await prisma.paymentEvent.findMany({
      where: { siteId },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    return NextResponse.json({
      totalRevenue: totalRevenue,
      transactionCount: transactionCount,
      dailyStats: dailyStats,
      packageBreakdown: breakdown,
      recentTransactions: recentEvents
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("Revenue Analytics API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
