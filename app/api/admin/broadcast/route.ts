import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBulkBroadcast } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const { message, siteId } = await req.json();

    // Get unique phone numbers from successful payments in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const where: any = {
      status: 'active',
      createdAt: { gte: sevenDaysAgo },
      phoneNumber: { not: null }
    };

    if (siteId && siteId !== 'all') {
        where.siteId = siteId;
    }

    const payments = await prisma.payment.findMany({
      where,
      select: { phoneNumber: true },
      distinct: ['phoneNumber']
    });

    const phoneNumbers = payments.map(p => p.phoneNumber as string);

    if (phoneNumbers.length === 0) {
      return NextResponse.json({ error: "No recipients found in the last 7 days" }, { status: 404 });
    }

    // In a real production app, we should use a background job/queue for this
    // but for now we'll do it in the request (might timeout if there are too many)
    await sendBulkBroadcast(phoneNumbers, message);

    return NextResponse.json({ success: true, count: phoneNumbers.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
