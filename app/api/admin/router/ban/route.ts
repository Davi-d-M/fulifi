import { NextResponse } from 'next/server';
import { banMikrotikDevice, terminateMikrotikSession } from '@/lib/mikrotik';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { macAddress, voucherCode, siteId, reason } = await request.json();
    if (!macAddress) {
      return NextResponse.json({ error: "Missing identity data" }, { status: 400 });
    }

    const currentSiteId = siteId || 'default-site';

    // 1. Update Database (Blacklist)
    await prisma.blacklistedDevice.upsert({
        where: { id: `ban_${macAddress}` }, // Assuming cuid but let's use a predictable ID or find first
        update: { reason: reason || 'Banned by Admin', siteId: currentSiteId },
        create: {
            macAddress,
            reason: reason || 'Banned by Admin',
            siteId: currentSiteId,
            bannedBy: 'Admin'
        }
    }).catch(() => {
        // Fallback if upsert fails due to schema constraints
        return prisma.blacklistedDevice.create({
            data: { macAddress, reason: reason || 'Banned by Admin', siteId: currentSiteId, bannedBy: 'Admin' }
        });
    });

    // 2. Kill current session if voucherCode provided
    if (voucherCode) {
        await terminateMikrotikSession(voucherCode, currentSiteId).catch(() => {});
    }

    // 3. Update Router Hardware (IP Binding)
    const result = await banMikrotikDevice(macAddress, currentSiteId);

    if (result.success) {
      return NextResponse.json({ success: true, message: "Device Banned Successfully" });
    } else {
      return NextResponse.json({ success: false, error: "Database updated but router failed to block MAC." }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error("Ban Device Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
