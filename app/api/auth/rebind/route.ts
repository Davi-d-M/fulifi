import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createMikrotikVoucher, activateHotspotSession, terminateMikrotikSession } from '@/lib/mikrotik';

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Brute-Force Throttling
    await new Promise(resolve => setTimeout(resolve, 1500));

    const { voucherCode, phoneNumber, mac, ip, siteId } = await req.json();

    if ((!voucherCode && !phoneNumber) || !mac) {
      return NextResponse.json({
        error: "Missing device identity",
        tip: "The system could not identify your phone's hardware address. Please reconnect to the Wi-Fi."
      }, { status: 400 });
    }

    // 1. Find the existing active session, payment, or bulk voucher
    let targetVoucher = voucherCode;
    let targetExpiry = new Date();
    let targetOfferId = '1hr';
    let targetSiteId = siteId || 'default-site';

    // A. Check Payment First
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [{ voucherCode: voucherCode }, { phoneNumber: phoneNumber }],
        status: 'active',
        expiresAt: { gt: new Date() }
      },
      include: { offer: true }
    });

    if (payment) {
        targetVoucher = payment.voucherCode;
        targetExpiry = payment.expiresAt;
        targetOfferId = payment.offerId || '1hr';
        targetSiteId = siteId || payment.siteId;
    } else {
        // B. Check ActiveSession Fallback (for Trials/Bulk)
        const session = await prisma.activeSession.findFirst({
            where: { voucherCode: voucherCode, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' }
        });

        if (session) {
            targetVoucher = session.voucherCode;
            targetExpiry = session.expiresAt;
            targetSiteId = siteId || session.siteId;
        } else {
            return NextResponse.json({ error: "No active subscription found for this info" }, { status: 404 });
        }
    }

    const currentSiteId = targetSiteId || 'default-site';

    // 2. Clear any old sessions for this voucher on the router
    await terminateMikrotikSession(targetVoucher, currentSiteId).catch(() => {});

    // 3. Re-provision with the NEW MAC address
    const routerResult = await createMikrotikVoucher(
      targetVoucher,
      targetOfferId,
      Math.max(1, Math.floor((targetExpiry.getTime() - Date.now()) / 60000)),
      'CONTINUOUS',
      mac,
      '5M/5M',
      undefined, undefined, undefined, undefined,
      currentSiteId,
      1
    );

    if (routerResult.success) {
      // 4. Update local records
      await prisma.activeSession.upsert({
        where: { macAddress: mac },
        update: { voucherCode: targetVoucher, ipAddress: ip, expiresAt: targetExpiry, siteId: currentSiteId },
        create: { macAddress: mac, voucherCode: targetVoucher, ipAddress: ip, expiresAt: targetExpiry, siteId: currentSiteId }
      });

      // 5. Inject live session
      await activateHotspotSession(mac, ip, targetVoucher, currentSiteId);

      return NextResponse.json({ success: true, voucherCode: targetVoucher });
    }

    return NextResponse.json({ error: "Router failed to re-bind session" }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
