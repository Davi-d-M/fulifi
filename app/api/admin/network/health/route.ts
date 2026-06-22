import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Read the status that was pushed by the router
  const data = (global as any).routerHealthData || {
    peripherals: [
      { name: 'Fiber Gateway', ip: '192.168.150.1', alive: false },
      { name: 'Core Switch', ip: '192.168.88.2', alive: false },
      { name: 'Access Point East', ip: '192.168.88.10', alive: false }
    ],
    wanStats: null
  };

  return NextResponse.json(data);
}
