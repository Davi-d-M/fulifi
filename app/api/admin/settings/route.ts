import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 'global' } }).catch(() => null);
    return NextResponse.json(settings || { bannerText: "", bannerType: "info", blockTethering: false });
  } catch (error: any) {
    return NextResponse.json({ bannerText: "", bannerType: "info", blockTethering: false });
  }
}

export async function POST(request: Request) {
  try {
    const { bannerText, bannerType, blockTethering } = await request.json();
    const settings = await prisma.systemSetting.upsert({
      where: { id: 'global' },
      update: { bannerText, bannerType, blockTethering },
      create: { id: 'global', bannerText, bannerType, blockTethering }
    });
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
