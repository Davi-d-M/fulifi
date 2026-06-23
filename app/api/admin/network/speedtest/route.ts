import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const logs = await prisma.speedTest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    // In a real production environment, we'd use 'speedtest-net' or similar
    // For this implementation, we simulate the watchdog logging
    // Usually triggered by a cron job or manual action

    const simulatedDownload = (Math.random() * 50 + 10).toFixed(2);
    const simulatedUpload = (Math.random() * 20 + 5).toFixed(2);
    const simulatedPing = (Math.random() * 30 + 5).toFixed(0);

    const log = await prisma.speedTest.create({
      data: {
        download: parseFloat(simulatedDownload),
        upload: parseFloat(simulatedUpload),
        ping: parseFloat(simulatedPing),
        isp: "Starlink/Fiber Simulation"
      }
    });

    return NextResponse.json(log);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
