import { NextRequest, NextResponse } from 'next/server';
import { scanForRogueAPs } from '@/lib/mikrotik';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const siteId = searchParams.get('siteId') || 'default-site';

      const results = await scanForRogueAPs(siteId);

      // Logic to detect rogues: same SSID but different MAC
      const mySSID = process.env.HOTSPOT_SSID || 'Starlinknet.WIFI';
      const rogueDetections = Array.isArray(results) ? results.filter((ap: any) =>
          ap.ssid === mySSID && !ap.is_mine
      ) : [];

      if (rogueDetections.length > 0) {
          await prisma.securityAlert.create({
              data: {
                  siteId,
                  type: 'ROGUE_AP',
                  severity: 'CRITICAL',
                  message: `Detected ${rogueDetections.length} unauthorized Access Points broadcasting ${mySSID}`
              }
          });
      }

      return NextResponse.json({ success: true, count: rogueDetections.length, totalScanned: results.length });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
