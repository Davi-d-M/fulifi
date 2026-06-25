import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Global store for hardware status (resets on redeploy, but updated every 10s by router)
let hardwareStatus: any = {
  "Fiber Gateway": { alive: false, lastSeen: 0 },
  "Core Switch": { alive: false, lastSeen: 0 },
  "Access Point East": { alive: false, lastSeen: 0 }
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || 'default-site';
    const secret = req.headers.get('x-router-secret');

    if (secret !== process.env.STARLINKNET_WIFI_ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Process Pending Vouchers
    const pendingVouchers = await prisma.payment.findMany({
      where: { siteId, status: 'active', provisioned: false },
      include: { offer: true },
      take: 5
    });

    let commands = "";
    for (const p of pendingVouchers) {
      const profile = p.offer?.name || "1-Hour-Pass";
      const limit = p.offer?.durationMin ? `${p.offer.durationMin}m` : "1h";
      commands += `/ip hotspot user add name="${p.voucherCode}" password="${p.voucherCode}" profile="${profile}" limit-uptime=${limit} comment="Paid via Paystack";`;
      await prisma.payment.update({ where: { id: p.id }, data: { provisioned: true } });
    }

    return new Response(commands);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// New POST method to receive Health Data from the router
export async function POST(req: Request) {
    try {
        const secret = req.headers.get('x-router-secret');
        if (secret !== process.env.STARLINKNET_WIFI_ADMIN_SECRET) return new Response("Unauthorized", { status: 401 });

        const body = await req.json();
        // Update the global status store
        (global as any).routerHealthData = body;

        return NextResponse.json({ success: true });
    } catch (e) {
        return new Response("Error", { status: 500 });
    }
}
