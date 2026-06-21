import { NextResponse } from 'next/server';
import { getMikrotikActiveSessions } from '@/lib/mikrotik';
import { prisma } from '@/lib/prisma';

// Simple in-memory cache to prevent router overload
let cachedSessionsMap: Record<string, any[]> = {};
let lastFetchTimeMap: Record<string, number> = {};
const CACHE_TTL = 30000; // 30 seconds

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || 'default-site';

    if (!(prisma as any).payment) {
        // Return empty or fallback if payment model is missing
        const liveSessions = await getMikrotikActiveSessions(siteId).catch(() => []);
        return NextResponse.json(liveSessions.map((s: any) => ({
            id: s['.id'],
            macAddress: s['mac-address'],
            ipAddress: s.address,
            voucherCode: s.user,
            uptime: s.uptime,
            bytesIn: s['bytes-in'],
            bytesOut: s['bytes-out'],
            packageName: "System Model Missing"
        })));
    }
    const now = Date.now();
    const lastFetchTime = lastFetchTimeMap[siteId] || 0;
    const cachedSessions = cachedSessionsMap[siteId] || [];

    // Return cached data if within TTL
    if (now - lastFetchTime < CACHE_TTL && cachedSessions.length > 0) {
      console.log(`[MikroTik] Serving active sessions from cache for ${siteId}`);
      return NextResponse.json(cachedSessions);
    }

    // Fetch live sessions from MikroTik
    const liveSessions = await getMikrotikActiveSessions(siteId).catch(() => []);
    if (liveSessions.length === 0) {
      cachedSessionsMap[siteId] = [];
      lastFetchTimeMap[siteId] = now;
      return NextResponse.json([]);
    }

    // Optimization: Fetch all relevant payments in ONE query to handle 300+ devices efficiently
    const voucherCodes = liveSessions.map((s: any) => s.user).filter(Boolean);
    const payments = await prisma.payment.findMany({
      where: {
        siteId,
        voucherCode: { in: voucherCodes }
      },
      include: { offer: true }
    });

    // Create a map for O(1) lookup
    const paymentMap = new Map(payments.map(p => [p.voucherCode, p]));

    const enhancedSessions = liveSessions.map((session: any) => {
      const payment = paymentMap.get(session.user);

      return {
        id: session['.id'],
        macAddress: session['mac-address'],
        ipAddress: session.address,
        voucherCode: session.user,
        uptime: session.uptime,
        bytesIn: session['bytes-in'],
        bytesOut: session['bytes-out'],
        packageName: payment?.offer?.name || (payment ? "Active Plan" : "Manual/Unknown")
      };
    });

    // Update cache if we got data (even if empty, but successful fetch)
    cachedSessionsMap[siteId] = enhancedSessions;
    lastFetchTimeMap[siteId] = now;

    return NextResponse.json(enhancedSessions);
  } catch (error: unknown) {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || 'default-site';
    console.error("Fetch Active Users Error:", error);
    // If router fetch fails but we have cached data, return that instead of a 500
    const cachedSessions = cachedSessionsMap[siteId] || [];
    if (cachedSessions.length > 0) {
      console.warn("[MikroTik] Fetch failed, serving stale cached data.");
      return NextResponse.json(cachedSessions);
    }
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
