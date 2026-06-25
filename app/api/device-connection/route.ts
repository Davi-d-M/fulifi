import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/device-connection
 * Log when a device connects to the WiFi hotspot
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { macAddress, ipAddress, deviceName, voucherCode, siteId = 'default-site' } = body;

    // SECURITY: Input Sanitization (Prevent XSS/Injection)
    const sanitize = (str: string) => str ? str.replace(/[<>\"']/g, '') : str;
    macAddress = sanitize(macAddress);
    ipAddress = sanitize(ipAddress);
    deviceName = sanitize(deviceName)?.substring(0, 50); // Limit length
    voucherCode = sanitize(voucherCode);

    // Validate required fields
    if (!macAddress || !ipAddress) {
      return NextResponse.json(
        { error: 'macAddress and ipAddress are required' },
        { status: 400 }
      );
    }

    console.log(
      `[Device Connection] 📱 Device connected: MAC=${macAddress}, IP=${ipAddress}, Voucher=${voucherCode || 'NONE'}`
    );

    // Create connection record
    const connection = await prisma.deviceConnection.create({
      data: {
        macAddress,
        ipAddress,
        deviceName: deviceName || 'Unknown Device',
        voucherCode: voucherCode || null,
        status: 'CONNECTED',
        siteId,
      },
    });

    // If a voucher is provided, sync with ActiveSession table
    if (voucherCode && voucherCode !== "NONE") {
        // Try to find the expiry time from Payment or BulkVoucher
        let expiresAt = new Date(Date.now() + 60 * 60 * 1000); // Default 1 hour fallback

        const payment = await prisma.payment.findFirst({ where: { voucherCode, siteId } });
        if (payment) {
            expiresAt = payment.expiresAt;
        } else {
            const bulk = await prisma.bulkVoucher.findUnique({ where: { voucherCode }, include: { offer: true } });
            if (bulk && bulk.offer) {
                expiresAt = new Date(Date.now() + bulk.offer.durationMin * 60 * 1000);
            }
        }

        await prisma.activeSession.upsert({
            where: { macAddress },
            update: { voucherCode, ipAddress, expiresAt, siteId },
            create: { macAddress, voucherCode, ipAddress, expiresAt, siteId }
        }).catch(() => {});
    }

    // Send real-time alert if admin notification is needed
    console.log(`[Device Connection] ✅ Logged connection: ${connection.id}`);

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      message: `Device ${macAddress} connected from ${ipAddress}`,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('[Device Connection] ❌ Error:', error);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to log device connection' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/device-connection?action=active
 * Get active connections or connection history
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'active';
    const siteId = searchParams.get('siteId') || 'default-site';
    const limit = parseInt(searchParams.get('limit') || '100');

    if (action === 'active') {
      // Get only active connections (connected, not expired)
      const activeConnections = await prisma.deviceConnection.findMany({
        where: {
          siteId,
          status: 'CONNECTED',
          disconnectedAt: null,
        },
        orderBy: { connectedAt: 'desc' },
        take: limit,
      });

      const count = activeConnections.length;
      console.log(`[Device Connection] 📊 Active devices: ${count}`);

      return NextResponse.json({
        success: true,
        action: 'active',
        count,
        devices: activeConnections,
      });
    }

    if (action === 'history') {
      // Get recent connection history (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const history = await prisma.deviceConnection.findMany({
        where: {
          siteId,
          connectedAt: { gte: yesterday },
        },
        orderBy: { connectedAt: 'desc' },
        take: limit,
      });

      return NextResponse.json({
        success: true,
        action: 'history',
        count: history.length,
        devices: history,
      });
    }

    if (action === 'stats') {
      // Get connection statistics
      const allConnections = await prisma.deviceConnection.findMany({
        where: { siteId },
      });

      const activeCount = allConnections.filter((c) => c.status === 'CONNECTED' && !c.disconnectedAt).length;
      const portalHits = allConnections.filter((c) => c.status === 'PORTAL_HIT').length;
      const disconnectedCount = allConnections.filter((c) => c.status === 'DISCONNECTED').length;
      const expiredCount = allConnections.filter((c) => c.status === 'EXPIRED').length;

      return NextResponse.json({
        success: true,
        action: 'stats',
        totalConnections: allConnections.length,
        activeConnections: activeCount,
        portalHits,
        disconnectedConnections: disconnectedCount,
        expiredConnections: expiredCount,
        firstConnection: allConnections[0]?.connectedAt,
        lastConnection: allConnections[allConnections.length - 1]?.connectedAt,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Device Connection] ❌ Query Error:', error);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to retrieve device connections' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/device-connection
 * Mark a device as disconnected
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { macAddress, ipAddress, status = 'DISCONNECTED' } = body;

    if (!macAddress) {
      return NextResponse.json(
        { error: 'macAddress is required' },
        { status: 400 }
      );
    }

    // Find the most recent connection for this MAC
    const connection = await prisma.deviceConnection.findFirst({
      where: {
        macAddress,
        status: 'CONNECTED',
        disconnectedAt: null,
      },
      orderBy: { connectedAt: 'desc' },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'No active connection found for this device' },
        { status: 404 }
      );
    }

    // Update the connection record
    const now = new Date();
    const sessionDuration = Math.floor(
      (now.getTime() - connection.connectedAt.getTime()) / 1000
    );

    const updated = await prisma.deviceConnection.update({
      where: { id: connection.id },
      data: {
        status,
        disconnectedAt: now,
        sessionDuration,
      },
    });

    console.log(
      `[Device Connection] 👋 Device disconnected: MAC=${macAddress}, Duration=${sessionDuration}s`
    );

    return NextResponse.json({
      success: true,
      message: `Device ${macAddress} marked as ${status}`,
      sessionDuration,
      disconnectionTime: now,
    });
  } catch (error: any) {
    console.error('[Device Connection] ❌ Disconnect Error:', error);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to update device connection' },
      { status: 500 }
    );
  }
}
