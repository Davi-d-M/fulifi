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

    if (!payment) {
      return NextResponse.json({ active: false });
    }

    const now = new Date();
    const expiresAt = new Date(payment.expiresAt);
    const isActive = expiresAt > now;
    const remainingMs = Math.max(0, expiresAt.getTime() - now.getTime());

    // Calculate readable remaining time
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);

    return NextResponse.json({
      active: isActive,
      voucherCode: payment.voucherCode,
      packageName: payment.offer?.name || "Standard Plan",
      expiresAt: payment.expiresAt,
      remaining: `${hours}h ${mins}m ${secs}s`,
      remainingMinutes: Math.floor(remainingMs / 60000)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
