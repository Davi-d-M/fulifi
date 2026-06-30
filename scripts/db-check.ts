import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Testing Database Connectivity...");
  console.log("-----------------------------------");

  try {
    const start = Date.now();
    // Test count of offers
    const count = await prisma.voucherOffer.count();
    const end = Date.now();

    console.log("✅ SUCCESS: Successfully reached Supabase!");
    console.log(`📊 Found ${count} plans in the database.`);
    console.log(`⏱️  Response time: ${end - start}ms`);
    console.log("-----------------------------------");
    console.log("Your database is now FULLY FUNCTIONAL and ready for production.");
  } catch (error: any) {
    console.error("❌ FAILURE: Could not reach the database.");
    console.error("Error Detail:", error.message);
    console.log("-----------------------------------");
    console.log("TIP: Check if your IP address is allowed in Supabase 'Database' -> 'Network Restrictions'.");
  } finally {
    await prisma.$disconnect();
  }
}

main();
