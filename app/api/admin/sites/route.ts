import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const sites = await prisma.site.findMany();
    return NextResponse.json(sites);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const site = await prisma.site.create({
            data: {
                name: body.name,
                location: body.location,
                routerHost: body.routerHost,
                routerUser: body.routerUser,
                routerPass: body.routerPass
            }
        });
        return NextResponse.json(site);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
