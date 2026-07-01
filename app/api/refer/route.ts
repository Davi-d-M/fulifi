import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addVoucherTime } from '@/lib/mikrotik';

export async function POST(req: NextRequest) {
  try {
    const { referrerVoucher, referredPhone } = await req.json();

    if (!referrerVoucher || !referredPhone) {
      return NextResponse.json({ error: "Missing information" }, { status: 400 });
    }

    // 1. Check if the referrer exists and is active
    const payment = await prisma.payment.findFirst({
      where: { voucherCode: referrerVoucher, status: 'active' }
    });

    if (!payment) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    }

    // 2. Log the referral
    await prisma.referral.create({
      data: {
        referrerVoucher,
        refereeMac: 'MANUAL-' + Date.now(),
        rewardMinutes: 30
      }
    });

    // 3. Instant Reward - Add 30 mins to the referrer
    await addVoucherTime(referrerVoucher, 30, payment.siteId);

    // Update the payment expiry in DB
    await prisma.payment.update({
        where: { id: payment.id },
        data: { expiresAt: new Date(payment.expiresAt.getTime() + (30 * 60000)) }
    });

    return NextResponse.json({ success: true, message: "Referral successful! 30 mins added to your session." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
