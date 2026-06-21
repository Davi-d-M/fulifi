import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { secret } = await request.json();

    // Safety check: requires admin secret
    if (secret !== process.env.STARLINKNET_WIFI_ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized nuclear reset attempt" }, { status: 401 });
    }

    console.log("--- STARTING REMOTE REVENUE RESET ---");

    // 1. Clear all payment records
    await prisma.payment.deleteMany({});

    // 2. Clear all webhook event logs
    await prisma.paymentEvent.deleteMany({});

    // 3. Clear all active hardware sessions
    await prisma.activeSession.deleteMany({});

    // 4. Clear all generated vouchers
    await prisma.voucher.deleteMany({});

    // 5. Reset inventory: make used bulk vouchers available again
    await prisma.bulkVoucher.updateMany({
      data: { isUsed: false }
    });

    console.log("--- REVENUE RESET COMPLETE ---");

    return NextResponse.json({ success: true, message: "System cleared successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
