import { NextResponse } from 'next/server';
import { setTetheringBlock } from '@/lib/mikrotik';

export async function POST(request: Request) {
  try {
    const { blockTethering } = await request.json();

    if (blockTethering === undefined) {
      return NextResponse.json({ error: "Missing setting" }, { status: 400 });
    }

    const result = await setTetheringBlock(blockTethering);

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    } else {
      return NextResponse.json({ success: false, error: result.message }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
