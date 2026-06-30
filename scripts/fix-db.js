const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Checking database schema...");
  try {
    // Try to add the missing columns using raw SQL
    // This is safer than db push if there are data conflicts or file locks
    const result = await prisma.$executeRawUnsafe(`
      ALTER TABLE Payment ADD COLUMN macAddress TEXT;
    `).catch(e => {
        if (e.message.includes("duplicate column name")) {
            console.log("Column macAddress already exists.");
        } else {
            throw e;
        }
    });

    await prisma.$executeRawUnsafe(`
      ALTER TABLE Payment ADD COLUMN ipAddress TEXT;
    `).catch(e => {
        if (e.message.includes("duplicate column name")) {
            console.log("Column ipAddress already exists.");
        } else {
            throw e;
        }
    });

    console.log("Database schema fixed successfully.");
  } catch (error) {
    console.error("Failed to fix database:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
