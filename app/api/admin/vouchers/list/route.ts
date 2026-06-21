import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || 'default-site';
    const p = prisma as any;

    // Resilience check
    if (!p.bulkVoucher) {
      console.warn("[Voucher List] Prisma model 'bulkVoucher' not initialized");
      return NextResponse.json([]);
    }

    const vouchers = await p.bulkVoucher.findMany({
      where: {
        siteId,
        isUsed: false
      },
      include: {
        offer: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Limit to 100 for performance
    });

    // Transform to match the dashboard's BulkVoucher interface
    const formattedVouchers = vouchers.map((v: any) => ({
      id: v.id,
      code: v.voucherCode,
      package_id: v.offerId,
      is_used: v.isUsed,
      createdAt: v.createdAt.toISOString(),
      packageName: v.offer?.name || 'Unknown Plan'
    }));

    return NextResponse.json(formattedVouchers);
  } catch (error: unknown) {
    console.error("Fetch Vouchers Error:", error);
    // Return empty list instead of crashing the dashboard
    return NextResponse.json([]);
  }
}
