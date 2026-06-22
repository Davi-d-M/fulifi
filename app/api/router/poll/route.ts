import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || 'default-site';
    const secret = req.headers.get('x-router-secret');

    if (secret !== process.env.STARLINKNET_WIFI_ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find payments that are active but not yet provisioned on the router
    const pendingVouchers = await prisma.payment.findMany({
      where: {
        siteId,
        status: 'active',
        provisioned: false
      },
      include: { offer: true },
      take: 5
    });

    if (pendingVouchers.length === 0) return new Response("");

    // Generate commands for the MikroTik to execute
    let commands = "";
    for (const p of pendingVouchers) {
      const profile = p.offer?.name || "1-Hour-Pass";
      const limit = p.offer?.durationMin ? `${p.offer.durationMin}m` : "1h";

      // Add user to hotspot
      commands += `/ip hotspot user add name="${p.voucherCode}" password="${p.voucherCode}" profile="${profile}" limit-uptime=${limit} comment="Paid via Paystack";`;

      // Mark as provisioned so we don't send it again
      await prisma.payment.update({
        where: { id: p.id },
        data: { provisioned: true }
      });
    }

    return new Response(commands);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}