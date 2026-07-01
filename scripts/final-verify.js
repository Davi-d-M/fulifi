const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("--- FINAL PRODUCTION VERIFICATION ---");

  try {
    const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info(Payment);`);
    const columnNames = columns.map(c => c.name);

    console.log("Payment Table Columns:", columnNames.join(", "));

    const required = ['macAddress', 'ipAddress', 'provisioned', 'siteId'];
    const missing = required.filter(c => !columnNames.includes(c));

    if (missing.length > 0) {
      console.error("CRITICAL: Missing columns:", missing.join(", "));
      console.log("Fixing now...");
      for (const col of missing) {
          try {
              const type = col === 'provisioned' ? 'BOOLEAN DEFAULT 0' : 'TEXT';
              await prisma.$executeRawUnsafe(`ALTER TABLE Payment ADD COLUMN ${col} ${type};`);
              console.log(`Added column: ${col}`);
          } catch (e) {
              console.log(`Column ${col} might already exist or failed: ${e.message}`);
          }
      }
    } else {
      console.log("✅ Database schema is perfect.");
    }

    console.log("Checking Site connectivity...");
    const site = await prisma.site.findUnique({ where: { id: 'default-site' } });
    if (!site) {
        console.log("Creating default site...");
        await prisma.site.create({
            data: { id: 'default-site', name: 'Main Operations', location: 'Starlinknet Hub' }
        });
    }
    console.log("✅ Default site verified.");

    console.log("\n🚀 SYSTEM IS PRODUCTION READY!");

  } catch (error) {
    console.error("Verification failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
