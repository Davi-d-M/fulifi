import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createMikrotikVoucher, activateHotspotSession } from '@/lib/mikrotik';

export async function POST(req: NextRequest) {
  try {
    const { mac, ip, siteId } = await req.json();

    if (!mac) {
      return NextResponse.json({ error: "Could not identify your device" }, { status: 400 });
    }

    const currentSiteId = siteId || 'default-site';

    // 1. Check if this MAC already used a trial in the last 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const existingTrial = await prisma.activeSession.findFirst({
      where: {
        macAddress: mac,
        createdAt: { gte: twentyFourHoursAgo },
        voucherCode: { startsWith: 'TRIAL-' }
      }
    });

    if (existingTrial) {
      return NextResponse.json({ error: "Free trial already used today. Please purchase a plan." }, { status: 403 });
    }

    // 2. Create Trial Record
    const trialCode = `TRIAL-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 Min Trial

    // 3. Provision on Router
    const routerResult = await createMikrotikVoucher(
      trialCode,
      'offer_1hr', // Use a standard profile but with shorter uptime
      10,
      'CONTINUOUS',
      mac,
      '2M/2M', // Trial speed is slower
      undefined, undefined, undefined, undefined,
      currentSiteId
    );

    if (routerResult.success) {
      // 4. Save session
      await prisma.activeSession.upsert({
        where: { macAddress: mac },
        update: { voucherCode: trialCode, ipAddress: ip, expiresAt: expiresAt, siteId: currentSiteId },
        create: { macAddress: mac, voucherCode: trialCode, ipAddress: ip, expiresAt: expiresAt, siteId: currentSiteId }
      });

      // 5. Inject live session
      await activateHotspotSession(mac, ip, trialCode, currentSiteId);

      return NextResponse.json({ success: true, voucherCode: trialCode });
    }

    return NextResponse.json({ error: "Router failed to start trial" }, { status: 500 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
