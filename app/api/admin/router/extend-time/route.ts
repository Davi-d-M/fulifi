import { NextResponse } from 'next/server';
import { addVoucherTime } from '@/lib/mikrotik';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { voucherCode, minutes, siteId } = await request.json();
    if (!voucherCode || !minutes) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const result = await addVoucherTime(voucherCode, minutes, siteId);

    if (result.success) {
      // Also update Prisma payment expiresAt to keep them in sync
      const payment = await prisma.payment.findFirst({
        where: { voucherCode, siteId: siteId || 'default-site' }
      });
      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            expiresAt: new Date(payment.expiresAt.getTime() + (minutes * 60000))
          }
        });
      }
      return NextResponse.json(result);
    }
    return NextResponse.json(result, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
