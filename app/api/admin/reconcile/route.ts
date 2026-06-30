import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createMikrotikVoucher } from '@/lib/mikrotik';

export async function POST(request: Request) {
  try {
    const { reference, siteId, forceByPhone } = await request.json();
    if (!reference) return NextResponse.json({ error: "Missing reference" }, { status: 400 });

    const currentSite = siteId || 'default-site';

    // 1. Find the payment
    let payment;
    if (forceByPhone) {
        payment = await prisma.payment.findFirst({
            where: { phoneNumber: reference, siteId: currentSite },
            orderBy: { createdAt: 'desc' },
            include: { offer: true }
        });
    } else {
        payment = await prisma.payment.findUnique({
            where: { transactionRef: reference },
            include: { offer: true }
        });
    }

    if (!payment) return NextResponse.json({ error: "Payment record not found" }, { status: 404 });

    // 2. Force activate
    const voucherCode = (payment.voucherCode === 'PENDING' || !payment.voucherCode) ? `MANUAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}` : payment.voucherCode;

    const durationMin = payment.offer?.durationMin || 60;

    // Provision on Router
    const routerResult = await createMikrotikVoucher(
      voucherCode,
      payment.offerId || '1hr',
      durationMin,
      payment.offer?.expiryMode || 'CONTINUOUS',
      undefined,
      payment.offer?.speedLimit || '5M/5M',
      payment.offer?.dataLimitMB || undefined,
      undefined,
      undefined,
      undefined,
      currentSite
    );

    if (routerResult.success) {
        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: 'active',
                voucherCode,
                provisioned: true,
                resultDesc: 'Manually Reconciled',
                siteId: currentSite
            }
        });
        return NextResponse.json({ success: true, voucherCode });
    }

    return NextResponse.json({ error: routerResult.error }, { status: 500 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
