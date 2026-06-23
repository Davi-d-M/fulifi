import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/device-blacklist
 * Add or update blacklisted device
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { macAddress, ipAddress, reason, severity = 'MEDIUM', bannedBy, notes, siteId = 'default-site' } = body;

    if (!macAddress || !bannedBy) {
      return NextResponse.json({ error: 'macAddress and bannedBy required' }, { status: 400 });
    }

    const blacklist = await prisma.blacklistedDevice.create({
      data: {
        macAddress,
        ipAddress,
        reason,
        severity,
        bannedBy,
        notes,
        siteId,
      },
    });

    console.log(`[Blacklist] Device ${macAddress} banned: ${reason}`);
    return NextResponse.json({ success: true, blacklist });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

/**
 * GET /api/device-blacklist
 * Get blacklisted devices
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || 'default-site';

    const blacklisted = await prisma.blacklistedDevice.findMany({
      where: { siteId },
      orderBy: { bannedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      count: blacklisted.length,
      devices: blacklisted,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

/**
 * DELETE /api/device-blacklist
 * Remove from blacklist (unban)
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { macAddress, siteId = 'default-site' } = body;

    if (!macAddress) {
      return NextResponse.json({ error: 'macAddress required' }, { status: 400 });
    }

    await prisma.blacklistedDevice.deleteMany({
      where: { macAddress, siteId },
    });

    console.log(`[Blacklist] Device ${macAddress} unbanned`);
    return NextResponse.json({ success: true, message: 'Device unbanned' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
