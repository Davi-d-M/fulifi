const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reset() {
  console.log("--- STARTING REVENUE RESET ---");

  try {
    // 1. Clear all payment records
    console.log("Clearing Payment history...");
    await prisma.payment.deleteMany({});

    // 2. Clear all webhook event logs
    console.log("Clearing Webhook Ledger...");
    await prisma.paymentEvent.deleteMany({});

    // 3. Clear all active hardware sessions
    console.log("Clearing Active Sessions...");
    await prisma.activeSession.deleteMany({});

    // 4. Clear all generated vouchers
    console.log("Clearing Vouchers...");
    await prisma.voucher.deleteMany({});

    // 5. Reset inventory: make used bulk vouchers available again
    console.log("Resetting BulkVoucher inventory...");
    await prisma.bulkVoucher.updateMany({
      data: { isUsed: false }
    });

    console.log("--- REVENUE RESET COMPLETE! SYSTEM IS FRESH ---");
  } catch (err) {
    console.error("CRITICAL RESET ERROR:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

reset();
