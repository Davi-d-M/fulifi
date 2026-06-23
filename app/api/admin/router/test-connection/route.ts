import { NextResponse } from 'next/server';
import { getMikrotikConfig } from '@/lib/mikrotik';
import { testLegacyConnection } from '@/lib/mikrotik-legacy';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('siteId') || 'default-site';

  try {
    const config = await getMikrotikConfig(siteId);

    console.log(`[Diagnostic] Testing legacy connection to ${config.host} (Port 8728)`);

    const result = await testLegacyConnection(siteId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        routerName: result.name,
        configUsed: {
          host: config.host,
          port: config.port,
          user: config.username,
          mode: config.port === 80 || config.port === 443 ? 'REST_API' : 'LEGACY_API'
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
        error: result.error,
        configUsed: {
          host: config.host,
          port: config.port,
          user: config.username,
          mode: config.port === 80 || config.port === 443 ? 'REST_API' : 'LEGACY_API'
        },
        tip: config.port === 80 || config.port === 443
          ? "Check if 'www' service (Port 80) is enabled in WinBox (IP > Services)."
          : "Check if 'api' service (Port 8728) is enabled in WinBox (IP > Services)."
      });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
