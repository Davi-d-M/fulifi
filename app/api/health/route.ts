import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { testMikrotikConnection } from '@/lib/mikrotik';

export const dynamic = 'force-dynamic';

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      router: 'unknown'
    }
  };

  try {
    // 1. Check Database
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'connected';
  } catch (e: any) {
    health.status = 'error';
    health.services.database = `failed: ${e.message}`;
  }

  try {
    // 2. Check Router
    const routerTest = await testMikrotikConnection();
    health.services.router = routerTest.success ? 'connected' : `failed: ${routerTest.message}`;
    if (!routerTest.success) health.status = 'degraded';
  } catch (e: any) {
    health.status = 'error';
    health.services.router = `error: ${e.message}`;
  }

  return NextResponse.json(health, { status: health.status === 'error' ? 500 : 200 });
}
