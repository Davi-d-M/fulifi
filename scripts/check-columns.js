const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRawUnsafe(`PRAGMA table_info(Payment);`);
    console.log("Payment Table Columns:");
    console.table(result.map(r => ({ name: r.name, type: r.type })));
  } catch (error) {
    console.error("Error checking columns:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
