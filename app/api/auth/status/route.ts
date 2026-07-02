import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // SECURITY: Brute-Force Throttling
    // Delay response to slow down automated voucher guessing scripts
    await new Promise(resolve => setTimeout(resolve, 1500));

    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get('id'); // voucherCode or phoneNumber
    const siteId = searchParams.get('siteId') || 'default-site';

    if (!identifier) {
      return NextResponse.json({ error: "Missing identifier" }, { status: 400 });
    }

    // 1. Check ActiveSession (Source of truth for "currently online" devices)
    const session = await prisma.activeSession.findFirst({
      where: {
        OR: [
          { macAddress: identifier },
          { voucherCode: identifier }
        ],
        siteId: siteId
      },
      orderBy: { createdAt: 'desc' }
    });

    let targetExpiresAt: Date | null = null;
    let targetPackageName = "Active Session";
    let targetVoucherCode = "";

    if (session) {
        targetExpiresAt = new Date(session.expiresAt);
        targetVoucherCode = session.voucherCode;
    } else {
        // 2. Fallback to Payment (for users who paid but haven't connected yet)
        const payment = await prisma.payment.findFirst({
          where: {
            OR: [
              { voucherCode: identifier },
              { phoneNumber: identifier }
            ],
            status: 'active',
            siteId: siteId
          },
          include: { offer: true },
          orderBy: { createdAt: 'desc' }
        });

        if (payment) {
            targetExpiresAt = new Date(payment.expiresAt);
            targetVoucherCode = payment.voucherCode;
            targetPackageName = payment.offer?.name || "Standard Plan";
        }
    }

    if (!targetExpiresAt) {
      return NextResponse.json({ active: false });
    }

    const now = new Date();
    const isActive = targetExpiresAt > now;
    const remainingMs = Math.max(0, targetExpiresAt.getTime() - now.getTime());

    // Calculate readable remaining time
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);

    return NextResponse.json({
      active: isActive,
      voucherCode: targetVoucherCode,
      packageName: targetPackageName,
      expiresAt: targetExpiresAt,
      remaining: `${hours}h ${mins}m ${secs}s`,
      remainingMinutes: Math.floor(remainingMs / 60000)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
