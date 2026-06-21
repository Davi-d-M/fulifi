import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createMikrotikVoucher, activateHotspotSession, terminateMikrotikSession } from '@/lib/mikrotik';

export async function POST(req: NextRequest) {
  try {
    const { voucherCode, phoneNumber, mac, ip, siteId } = await req.json();

    if ((!voucherCode && !phoneNumber) || !mac) {
      return NextResponse.json({ error: "Missing identity or hardware address" }, { status: 400 });
    }

    // 1. Find the existing active session/payment
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { voucherCode: voucherCode },
          { phoneNumber: phoneNumber }
        ],
        status: 'active',
        expiresAt: { gt: new Date() }
      },
      include: { offer: true }
    });

    if (!payment) {
      return NextResponse.json({ error: "No active subscription found for this info" }, { status: 404 });
    }

    const currentSiteId = siteId || payment.siteId || 'default-site';

    // 2. Clear any old sessions for this voucher on the router
    await terminateMikrotikSession(payment.voucherCode, currentSiteId).catch(() => {});

    // 3. Re-provision with the NEW MAC address
    const routerResult = await createMikrotikVoucher(
      payment.voucherCode,
      payment.offerId || '1hr',
      Math.max(0, Math.floor((payment.expiresAt.getTime() - Date.now()) / 60000)),
      payment.offer?.expiryMode || 'CONTINUOUS',
      mac,
      payment.offer?.speedLimit || '5M/5M',
      undefined, undefined, undefined, undefined,
      currentSiteId
    );

    if (routerResult.success) {
      // 4. Update local records
      await prisma.activeSession.upsert({
        where: { macAddress: mac },
        update: { voucherCode: payment.voucherCode, ipAddress: ip, expiresAt: payment.expiresAt, siteId: currentSiteId },
        create: { macAddress: mac, voucherCode: payment.voucherCode, ipAddress: ip, expiresAt: payment.expiresAt, siteId: currentSiteId }
      });

      // 5. Inject live session
      await activateHotspotSession(mac, ip, payment.voucherCode, currentSiteId);

      return NextResponse.json({ success: true, voucherCode: payment.voucherCode });
    }

    return NextResponse.json({ error: "Router failed to re-bind session" }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
