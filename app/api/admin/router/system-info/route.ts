import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || 'default-site';

    // Check for "pushed" data in global memory first (Cloud Bridge Mode)
    const heartbeats = (global as any).routerHeartbeats || {};
    const siteData = heartbeats[siteId];

    if (siteData) {
      // Check if data is fresh (within last 30 seconds)
      const lastSeen = new Date(siteData.lastSeen).getTime();
      const now = Date.now();

      if (now - lastSeen < 30000) {
          return NextResponse.json({
              'cpu-load': siteData['cpu-load'] || 0,
              'free-memory': siteData['free-memory'] || 0,
              uptime: siteData.uptime || '0s',
              name: 'MikroTik (Cloud Synced)',
              boardName: siteData['board-name'] || 'RouterBoard',
              version: siteData.version || '7.x',
              isOnline: true
          });
      }
    }

    // Fallback if no fresh data found
    return NextResponse.json({
        'cpu-load': 0,
        'free-memory': 0,
        uptime: 'offline',
        name: 'MikroTik (Disconnected)',
        isOffline: true,
        isOnline: false
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
