import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 'global' } });
    return NextResponse.json(settings || { bannerText: "", bannerType: "info" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { bannerText, bannerType } = await request.json();
    const settings = await prisma.systemSetting.upsert({
      where: { id: 'global' },
      update: { bannerText, bannerType },
      create: { id: 'global', bannerText, bannerType }
    });
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
