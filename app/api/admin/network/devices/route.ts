import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId') || 'default-site';

    const devices = await prisma.networkDevice.findMany({
      where: { siteId },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(devices);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, ipAddress, type, siteId, smartPlugId } = body;

    const device = await prisma.networkDevice.create({
      data: {
        name,
        ipAddress,
        type,
        siteId: siteId || 'default-site',
        smartPlugId,
        status: 'ONLINE' // Default to online for now
      }
    });

    return NextResponse.json(device, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
