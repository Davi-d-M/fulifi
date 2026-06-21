import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { activateHotspotSession } from '@/lib/mikrotik';

export async function POST(request: Request) {
  try {
    const { voucherCode, targetMacAddress, deviceType } = await request.json();

    if (!voucherCode || !targetMacAddress) {
      return NextResponse.json({ success: false, message: "Missing required details" }, { status: 400 });
    }

    // 1. Verify the voucher exists and is active
    const payment = await prisma.payment.findFirst({
      where: {
        voucherCode: voucherCode,
        status: 'active',
        expiresAt: { gt: new Date() }
      },
      include: { offer: true }
    });

    if (!payment) {
      return NextResponse.json({ success: false, message: "Voucher not found or expired" }, { status: 404 });
    }

    // 2. Check device limit
    const activeSessions = await prisma.activeSession.count({
      where: { voucherCode: voucherCode }
    });

    const maxDevices = payment.offer?.maxDevices || 1;

    if (activeSessions >= maxDevices) {
      return NextResponse.json({
        success: false,
        message: `This package only supports ${maxDevices} device(s). Limit reached.`
      }, { status: 400 });
    }

    // 3. Prevent duplicate sessions for same MAC
    const existingSession = await prisma.activeSession.findUnique({
      where: { macAddress: targetMacAddress }
    });

    if (existingSession) {
       // If it exists but for a different voucher, we'll replace it
       await prisma.activeSession.delete({ where: { id: existingSession.id } });
    }

    // 4. Force-Authorize on MikroTik
    // We use a dummy IP or 0.0.0.0 if not known, MikroTik will update it on first packet
    const routerResult = await activateHotspotSession(targetMacAddress, "0.0.0.0", voucherCode);

    if (!routerResult.success) {
      // If the router is offline, we still save it in DB for the auto-retry system
      console.warn(`[Link-Device] Router auth failed: ${routerResult.message}`);
    }

    // 5. Save to Database
    await prisma.activeSession.create({
      data: {
        macAddress: targetMacAddress,
        ipAddress: "0.0.0.0",
        voucherCode: voucherCode,
        deviceType: deviceType || "TV",
        expiresAt: payment.expiresAt
      }
    });

    return NextResponse.json({
      success: true,
      message: `${deviceType || 'Device'} successfully linked! You can now use it on the network.`
    });

  } catch (error: any) {
    console.error("[Link-Device] Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
