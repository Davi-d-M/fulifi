import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMikrotikExport } from '@/lib/mikrotik';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const siteId = searchParams.get('siteId') || 'default-site';
        const backups = await prisma.routerBackup.findMany({
            where: { siteId },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        return NextResponse.json(backups);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
  try {
    const { siteId } = await req.json();
    const content = await getMikrotikExport(siteId);

    if (!content) {
      return NextResponse.json({ error: "Failed to generate export from router" }, { status: 500 });
    }

    const backup = await prisma.routerBackup.create({
      data: {
        siteId: siteId || 'default-site',
        filename: `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.rsc`,
        content: content
      }
    });

    return NextResponse.json(backup);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
