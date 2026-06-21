import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 1. MAC Reuse: Identify phones/payments with multiple distinct MACs
    const reuse = await prisma.paymentEvent.groupBy({
      by: ['phoneNumber'],
      _count: {
        macAddress: true
      },
      having: {
        phoneNumber: { _count: { gt: 1 } }
      }
    });

    // 2. High Volume Consumers (This is harder without per-session byte history, but we can look at ActiveSession)
    // Actually we need live data from Router usually. For now let's just return MAC list.

    return NextResponse.json({
        macReuse: reuse,
        highUsage: [] // Needs MikroTik data merging in UI
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
