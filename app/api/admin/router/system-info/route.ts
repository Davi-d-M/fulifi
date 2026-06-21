import { NextRequest, NextResponse } from 'next/server';
import { getMikrotikResources } from '@/lib/mikrotik';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || 'default-site';
    const resources = await getMikrotikResources(siteId);
    if (resources) {
      return NextResponse.json(resources);
    }
    return NextResponse.json({ error: "Could not reach router" }, { status: 502 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
