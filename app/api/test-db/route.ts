import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Create default site if it doesn't exist
    let site = await prisma.site.findUnique({
      where: { id: 'default-site' }
    });

    if (!site) {
      site = await prisma.site.create({
        data: {
          id: 'default-site',
          name: 'Default Site',
          location: 'Local'
        }
      });
      console.log('Created default site');
    }

    const events = await prisma.paymentEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return NextResponse.json({
      site,
      events,
      payments,
      message: 'Database initialized'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

