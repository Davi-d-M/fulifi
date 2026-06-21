import { NextResponse } from 'next/server';
import { banMikrotikDevice } from '@/lib/mikrotik';

export async function POST(request: Request) {
  try {
    const { macAddress, voucherCode, siteId } = await request.json();
    if (!macAddress || !voucherCode) {
      return NextResponse.json({ error: "Missing identity data" }, { status: 400 });
    }

    const result = await banMikrotikDevice(macAddress, voucherCode, siteId);

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    } else {
      return NextResponse.json({ success: false, error: result.message }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error("Ban Device Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
