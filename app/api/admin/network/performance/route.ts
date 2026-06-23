import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId') || 'default-site';

    const logs = await prisma.performanceLog.findMany({
      where: { siteId },
      orderBy: { timestamp: 'desc' },
      take: 20
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { siteId, downloadSpeed, uploadSpeed, latency, provider } = body;

    const log = await prisma.performanceLog.create({
      data: {
        siteId: siteId || 'default-site',
        downloadSpeed,
        uploadSpeed,
        latency,
        provider
      }
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
