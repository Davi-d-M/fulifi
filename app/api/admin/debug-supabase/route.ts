import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic route to verify Supabase Cloud Database connection.
 * Access this at: your-site.vercel.app/api/admin/debug-supabase
 */
export async function GET() {
  console.log("[Diagnostic] Testing Supabase connection via Prisma...");

  try {
    // 1. Try to perform a simple count operation on the 'Site' table
    const siteCount = await prisma.site.count();

    // 2. Try to fetch a single site to verify read access
    const testSite = await prisma.site.findFirst();

    return NextResponse.json({
      success: true,
      status: "DATABASE_CONNECTED",
      message: "🎉 Success! Your app is talking to Supabase.",
      details: {
        totalSitesFound: siteCount,
        activeSiteName: testSite?.name || "No sites registered yet",
        databaseType: "PostgreSQL (Cloud)"
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[Diagnostic] Supabase Connection FAILED:", error.message);

    return NextResponse.json({
      success: false,
      status: "CONNECTION_FAILED",
      error: error.message,
      tip: "Check your DATABASE_URL in Vercel environment variables. Ensure it matches the Supabase 'Transaction' connection string (Port 6543)."
    }, { status: 500 });
  }
}
