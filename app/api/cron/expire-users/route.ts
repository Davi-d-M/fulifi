import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { terminateMikrotikSession } from '@/lib/mikrotik';

export const runtime = 'nodejs';
export const maxDuration = 30; // Cleanups can take time if many users expire

export async function GET(request: Request) {
  // Security check: Ensure only your cron service can hit this route
  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedToken) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date();

    // 1. Fetch expired IDs and VoucherCodes only (Memory Efficient)
    const expiredPayments = await prisma.payment.findMany({
      where: {
        status: 'active',
        expiresAt: { lt: now }
      },
      select: { id: true, voucherCode: true }
    });

    if (expiredPayments.length === 0) {
      return NextResponse.json({ message: "No expired sessions to clean up." });
    }

    console.log(`[Cron] Found ${expiredPayments.length} expired sessions. Processing...`);

    const expiredVoucherCodes = expiredPayments.map(p => p.voucherCode);
    const expiredIds = expiredPayments.map(p => p.id);

    // 2. Process Router Terminations (Needs individual calls, but we can do them in parallel with a limit)
    // For 300 devices, we'll do them in chunks to avoid overwhelming the router REST API
    const CHUNK_SIZE = 10;
    for (let i = 0; i < expiredVoucherCodes.length; i += CHUNK_SIZE) {
      const chunk = expiredVoucherCodes.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(code => terminateMikrotikSession(code).catch(() => {})));
    }

    // 3. Perform Batch Database Updates (Atomic and High Performance)
    await prisma.$transaction([
      prisma.payment.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: 'expired' }
      }),
      prisma.activeSession.deleteMany({
        where: { voucherCode: { in: expiredVoucherCodes } }
      })
    ]);

    return NextResponse.json({
      success: true,
      processed: expiredPayments.length
    });

  } catch (error: any) {
    console.error("[Cron] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
