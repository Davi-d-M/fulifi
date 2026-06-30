import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Shared global storage for router heartbeats (resets on redeploy, but updated frequently)
// In a high-traffic production app, you'd use Redis or DB, but for hotfix this is fastest.
if (!(global as any).routerHeartbeats) {
  (global as any).routerHeartbeats = {};
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('siteId') || 'default-site';
  const secret = request.headers.get('x-router-secret');

  // Security Check
  if (secret !== process.env.STARLINKNET_WIFI_ADMIN_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // 1. Find all active payments that haven't been provisioned on the router yet
    const pendingVouchers = await prisma.payment.findMany({
      where: {
        siteId,
        status: 'active',
        provisioned: false
      },
      include: { offer: true },
      take: 10
    });

    // 2. Generate MikroTik RouterOS Commands for these users
    let commands = "";
    for (const p of pendingVouchers) {
      const profile = p.offer?.name || "1-Hour-Pass";
      const limit = p.offer?.durationMin ? `${p.offer.durationMin}m` : "1h";
      const rate = p.offer?.speedLimit || "5M/5M";
      const dataCap = p.offer?.dataLimitMB ? ` limit-bytes-total=${p.offer.dataLimitMB * 1024 * 1024}` : "";

      // Construct the command
      commands += `/ip hotspot user add name="${p.voucherCode}" password="${p.voucherCode}" profile="${profile}" limit-uptime=${limit} rate-limit="${rate}"${dataCap} comment="Cloud Pushed: ${new Date().toLocaleDateString()}";\n`;

      // Mark as provisioned so we don't send it again
      await prisma.payment.update({
        where: { id: p.id },
        data: { provisioned: true }
      });
    }

    // 3. Return as a plain text script file (.rsc)
    return new Response(commands || "", {
      headers: { 'Content-Type': 'text/plain' }
    });

  } catch (error: any) {
    console.error("[Poll Pull Error]", error.message);
    return new Response("", { status: 500 });
  }
}

export async function POST(request: Request) {
  const secret = request.headers.get('x-router-secret');
  if (secret !== process.env.STARLINKNET_WIFI_ADMIN_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const siteId = body.siteId || 'default-site';

    // Store heartbeat data in global memory
    const g = global as any;
    g.routerHeartbeats = g.routerHeartbeats || {};
    g.routerHeartbeats[siteId] = {
        ...body,
        lastSeen: new Date().toISOString(),
        isOnline: true
    };

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
