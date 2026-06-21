import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || 'default-site';

    // Check if models exist on prisma instance to prevent crash
    const p = prisma as any;
    if (!p.payment || !p.activeSession) {
      console.error("Prisma models 'payment' or 'activeSession' are missing. Please run 'npx prisma generate'.");
      return NextResponse.json({
        totalRevenue: 0,
        activeTickets: [],
        recentPayments: [],
        warning: "Database models not generated. Please run 'npx prisma generate'."
      });
    }

    // 1. Calculate Total Revenue using optimized aggregation
    const revenueSum = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { siteId }
    });

    const totalRevenue = revenueSum._sum.amount || 0;

    // 2. Fetch Active Tickets/Sessions
    const activeSessions = await prisma.activeSession.findMany({
      where: {
        siteId,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 3. Fetch Recent Payments
    const recentPayments = await prisma.payment.findMany({
      where: { siteId },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    return NextResponse.json({
      totalRevenue,
      activeTickets: activeSessions,
      recentPayments
    });

  } catch (error: unknown) {
    console.error("Metrics Fetch Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
