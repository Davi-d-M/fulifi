import { NextResponse } from 'next/server';
import { testMikrotikConnection, getProfileName } from '@/lib/mikrotik';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { packageId } = await request.json();

    // 1. Check Router Connection
    const connTest = await testMikrotikConnection();
    if (!connTest.success) {
      return NextResponse.json({ error: `Router Unreachable: ${connTest.message}` }, { status: 502 });
    }

    // 2. Resolve Profile Name
    const profileName = getProfileName(packageId);

    // 3. Attempt to verify if the profile exists on the router (mocked check or actual GET)
    // For now, we'll just return success if the connection is good and we mapped the profile
    return NextResponse.json({
      success: true,
      message: `Router connected successfully. Profile mapped to: "${profileName}". Ready for provisioning.`
    });

  } catch (error: any) {
    console.error("Test Provision Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
