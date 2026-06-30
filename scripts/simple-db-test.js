const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Testing connection...");
  try {
    const res = await prisma.$queryRaw`SELECT 1`;
    console.log("Success:", res);
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
