import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVoucherToCustomer } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const { reference, phoneNumber } = await req.json();

    const payment = await prisma.payment.findUnique({
      where: { transactionRef: reference },
      include: { offer: true }
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (!payment.voucherCode) {
      return NextResponse.json({ error: "No voucher code generated" }, { status: 400 });
    }

    const targetPhone = phoneNumber || payment.phoneNumber;
    if (!targetPhone) {
      return NextResponse.json({ error: "No phone number available" }, { status: 400 });
    }

    await sendVoucherToCustomer(
      targetPhone,
      payment.voucherCode,
      payment.offer?.name || 'Standard Pass',
      payment.amount
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
