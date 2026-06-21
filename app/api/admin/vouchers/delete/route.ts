import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: Request) {
  try {
    const { voucherId } = await request.json();

    if (!voucherId) {
      return NextResponse.json({ error: "Missing voucher ID" }, { status: 400 });
    }

    // Attempt to delete from BulkVoucher (physical vouchers)
    const bulkVoucher = await prisma.bulkVoucher.findUnique({
      where: { id: voucherId }
    });

    if (bulkVoucher) {
      await prisma.bulkVoucher.delete({
        where: { id: voucherId }
      });
      return NextResponse.json({ success: true, message: "Physical voucher deleted" });
    }

    // If not found in BulkVoucher, try deleting from the main Voucher table
    const voucher = await prisma.voucher.findUnique({
      where: { id: voucherId }
    });

    if (voucher) {
      await prisma.voucher.delete({
        where: { id: voucherId }
      });
      return NextResponse.json({ success: true, message: "Voucher deleted" });
    }

    return NextResponse.json({ error: "Voucher not found" }, { status: 404 });

  } catch (error: any) {
    console.error("[Delete-Voucher] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
