import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/device-whitelist
 * Add whitelisted device (free access)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { macAddress, ipAddress, name, reason, freeAccess = true, createdBy, siteId = 'default-site' } = body;

    if (!macAddress || !name || !createdBy) {
      return NextResponse.json({ error: 'macAddress, name, createdBy required' }, { status: 400 });
    }

    const whitelist = await prisma.whitelistedDevice.create({
      data: {
        macAddress,
        ipAddress,
        name,
        reason,
        freeAccess,
        createdBy,
        siteId,
      },
    });

    console.log(`[Whitelist] Device ${macAddress} whitelisted: ${name}`);
    return NextResponse.json({ success: true, whitelist });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Device already whitelisted' }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

/**
 * GET /api/device-whitelist
 * Get whitelisted devices
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || 'default-site';

    const whitelisted = await prisma.whitelistedDevice.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      count: whitelisted.length,
      devices: whitelisted,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

/**
 * DELETE /api/device-whitelist
 * Remove from whitelist
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { macAddress, siteId = 'default-site' } = body;

    if (!macAddress) {
      return NextResponse.json({ error: 'macAddress required' }, { status: 400 });
    }

    await prisma.whitelistedDevice.delete({
      where: { macAddress },
    });

    console.log(`[Whitelist] Device ${macAddress} removed from whitelist`);
    return NextResponse.json({ success: true, message: 'Device removed from whitelist' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
