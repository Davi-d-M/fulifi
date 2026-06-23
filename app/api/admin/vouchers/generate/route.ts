import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WIFI_BILLING_CATALOG } from '@/app/config/packages';
import crypto from 'crypto';

// Use the same readable character set as the webhook
const generateSecureCode = (length = 8) => {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => charset.charAt(Math.floor(Math.random() * charset.length))).join('');
};

export async function POST(request: Request) {
  console.log("[Bulk] Generation request started");

  try {
    const p = prisma as any;

    // Safety check for Prisma initialization
    if (!p.bulkVoucher || !p.voucherOffer) {
      console.error("[Bulk] Prisma models missing");
      return NextResponse.json({
        error: "Database configuration error. Please try again in a few seconds."
      }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const package_id = String(body.package_id || "");
    const batch_size = parseInt(String(body.batch_size), 10);
    const siteId = body.siteId || 'default-site';

    if (!package_id || isNaN(batch_size) || batch_size <= 0) {
      return NextResponse.json({ error: "Please select a plan and enter a quantity." }, { status: 400 });
    }

    // 1. Ensure the package exists in the database
    let offer = await p.voucherOffer.findUnique({ where: { id: package_id } });

    // CRITICAL: Ensure the site exists to satisfy foreign key constraints
    const site = await p.site.findUnique({ where: { id: siteId } });
    if (!site) {
      console.log(`[Bulk] Creating missing site: ${siteId}`);
      await p.site.create({
        data: {
          id: siteId,
          name: siteId === 'default-site' ? 'Main Operations' : siteId,
          location: 'Auto-Generated'
        }
      });
    }

    if (!offer) {
      const staticPkg = WIFI_BILLING_CATALOG[package_id];
      if (staticPkg) {
        console.log(`[Bulk] Syncing static package ${package_id} to DB...`);
        offer = await p.voucherOffer.upsert({
          where: { id: staticPkg.id },
          update: {},
          create: {
            id: staticPkg.id,
            name: staticPkg.name,
            duration: `${staticPkg.durationHours} Hours`,
            durationMin: staticPkg.durationHours * 60,
            price: staticPkg.price,
            downloadLimit: staticPkg.speedLimit,
            uploadLimit: "Unlimited",
            speedLimit: staticPkg.speedLimit,
            isSystem: true,
            expiryMode: "CONTINUOUS",
            siteId
          }
        });
      } else {
        return NextResponse.json({ error: "Selected plan not found in catalog." }, { status: 404 });
      }
    }

    // 2. Generation Logic with Collision Protection
    const maxBatch = 500;
    const finalBatchSize = Math.min(batch_size, maxBatch);

    console.log(`[Bulk] Generating ${finalBatchSize} codes for ${offer.name} at site ${siteId}`);

    // Generate codes and check against DB to avoid collisions
    const codesToInsert = new Set<string>();
    let attempts = 0;
    while (codesToInsert.size < finalBatchSize && attempts < finalBatchSize * 3) {
      const newCode = generateSecureCode();
      codesToInsert.add(newCode);
      attempts++;
    }

    // Check which ones already exist in the DB
    const existingVouchers = await p.bulkVoucher.findMany({
      where: {
        voucherCode: { in: Array.from(codesToInsert) }
      },
      select: { voucherCode: true }
    });

    const existingCodes = new Set(existingVouchers.map((v: any) => v.voucherCode));
    const uniqueCodes = Array.from(codesToInsert).filter(code => !existingCodes.has(code));

    if (uniqueCodes.length === 0) {
        throw new Error("Could not generate unique codes. Please try again.");
    }

    // Perform batch insert - use a loop for better error handling on SQLite
    const createdResults = [];
    for (const data of vouchersData) {
      try {
        const v = await p.bulkVoucher.create({
          data,
          include: { offer: true }
        });
        createdResults.push(v);
      } catch (e: any) {
        console.warn(`[Bulk] Skipping code ${data.voucherCode} due to error:`, e.message);
      }
    }

    if (createdResults.length === 0) {
        throw new Error("Failed to create any vouchers. Check database constraints.");
    }

    const formattedData = createdResults.map((v: any) => ({
      id: v.id,
      code: v.voucherCode,
      package_id: v.offerId,
      packageName: v.offer?.name || offer.name,
      createdAt: v.createdAt
    }));

    console.log(`[Bulk] Successfully generated ${formattedData.length} vouchers.`);

    return NextResponse.json({
      success: true,
      vouchers: formattedData,
      count: formattedData.length
    });

  } catch (error: any) {
    console.error("[Bulk] Fatal error during generation:", error);

    // Provide more specific error for common issues
    let errorMsg = "An error occurred while generating vouchers. Please try a smaller batch size.";
    if (error.message?.includes("foreign key constraint")) {
      errorMsg = "Database Sync Error: Please ensure all sites and packages are correctly registered.";
    } else if (error.code === "P2002") {
      errorMsg = "Collision Error: Some codes already exist. Please try again.";
    }

    return NextResponse.json({
      error: errorMsg,
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
}
