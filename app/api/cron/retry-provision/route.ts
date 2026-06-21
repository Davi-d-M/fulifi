import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createMikrotikVoucher } from '@/lib/mikrotik';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Simple check for Cron auth if needed
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 1. Find payments that are active but failed to provision on the router
    const pendingProvisions = await prisma.payment.findMany({
      where: {
        status: 'active',
        provisioned: false,
        retryCount: { lt: 5 }, // Max 5 retries
        createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Only last 24h
      },
      include: { offer: true },
      take: 10
    });

    if (pendingProvisions.length === 0) {
      return NextResponse.json({ message: "No pending provisions." });
    }

    console.log(`[Retry-Cron] Attempting to provision ${pendingProvisions.length} stuck sessions...`);

    let successes = 0;

    for (const payment of pendingProvisions) {
      // Find associated active session to get MAC if it exists
      const session = await prisma.activeSession.findFirst({
        where: { voucherCode: payment.voucherCode }
      });

      const result = await createMikrotikVoucher(
        payment.voucherCode,
        payment.offerId || '1hr',
        (payment.offer?.durationMin || 60) + 3, // Include grace period
        payment.offer?.expiryMode || 'CONTINUOUS',
        session?.macAddress || undefined,
        payment.offer?.speedLimit || '5M/5M',
        payment.offer?.dataLimitMB || 0
      );

      if (result.success) {
        successes++;
        await prisma.payment.update({
          where: { id: payment.id },
          data: { provisioned: true, resultDesc: 'Provisioned via Auto-Retry System' }
        });
      } else {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            retryCount: { increment: 1 },
            resultDesc: `Retry failed (${payment.retryCount + 1}/5): ${result.error}`
          }
        });
      }
    }

    return NextResponse.json({
      processed: pendingProvisions.length,
      successes
    });

  } catch (error: any) {
    console.error("[Retry-Cron] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
