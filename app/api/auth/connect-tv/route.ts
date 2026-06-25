import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createMikrotikVoucher, activateHotspotSession } from '@/lib/mikrotik';

export async function POST(req: NextRequest) {
  try {
    const { tvMac, voucherCode, siteId } = await req.json();

    if (!tvMac || !voucherCode) {
      return NextResponse.json({ error: "Missing TV MAC or Voucher Code" }, { status: 400 });
    }

    // 1. Validate the voucher exists and is active
    const payment = await prisma.payment.findFirst({
      where: {
        voucherCode: voucherCode,
        status: 'active',
        expiresAt: { gt: new Date() }
      },
      include: { offer: true }
    });

    if (!payment) {
      return NextResponse.json({ error: "Invalid or expired voucher code" }, { status: 404 });
    }

    const currentSiteId = siteId || payment.siteId || 'default-site';

    // 2. Provision the TV on MikroTik
    // We use the same voucher but bind it to the TV's MAC
    const routerResult = await createMikrotikVoucher(
      `TV-${voucherCode}`,
      payment.offerId || '1hr',
      Math.max(0, Math.floor((payment.expiresAt.getTime() - Date.now()) / 60000)),
      'CONTINUOUS',
      tvMac,
      '15M/15M', // Fast speed for TV streaming
      undefined, undefined, undefined, undefined,
      currentSiteId
    );

    if (routerResult.success) {
      // 3. Log the TV session
      await prisma.activeSession.upsert({
        where: { macAddress: tvMac },
        update: { voucherCode: voucherCode, expiresAt: payment.expiresAt, deviceType: 'TV', siteId: currentSiteId },
        create: { macAddress: tvMac, voucherCode: voucherCode, ipAddress: '0.0.0.0', expiresAt: payment.expiresAt, deviceType: 'TV', siteId: currentSiteId }
      });

      return NextResponse.json({ success: true, message: "TV Connected! It should have internet in 30 seconds." });
    }

    return NextResponse.json({ error: "Router failed to whitelist TV" }, { status: 500 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
