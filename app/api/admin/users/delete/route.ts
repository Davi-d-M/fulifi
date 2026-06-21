import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { terminateMikrotikSession } from '@/lib/mikrotik';

export async function DELETE(request: Request) {
  try {
    const { voucherCode } = await request.json();

    if (!voucherCode) {
      return NextResponse.json({ error: "Missing voucher code" }, { status: 400 });
    }

    console.log(`[Admin] Full deletion for user/voucher: ${voucherCode}`);

    // 1. Terminate on MikroTik Router
    try {
      await terminateMikrotikSession(voucherCode);
    } catch (routerErr) {
      console.warn("[Admin] Router termination failed or user already gone:", routerErr);
    }

    // 2. Delete from Database
    // We use a transaction to clean up all related records
    await prisma.$transaction([
      // Remove active session
      prisma.activeSession.deleteMany({
        where: { voucherCode: voucherCode }
      }),
      // Remove voucher record
      prisma.voucher.deleteMany({
        where: { code: voucherCode }
      }),
      // Remove from BulkVoucher if it exists
      prisma.bulkVoucher.deleteMany({
        where: { voucherCode: voucherCode }
      }),
      // Optional: Set payment status to cancelled or deleted?
      // Usually we keep payment records for accounting, but we can mark them.
      prisma.payment.updateMany({
        where: { voucherCode: voucherCode },
        data: { status: 'deleted' }
      })
    ]);

    return NextResponse.json({ success: true, message: `User ${voucherCode} completely removed from system.` });

  } catch (error: any) {
    console.error("[Delete-User] Error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
