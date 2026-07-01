/**
 * PRODUCTION HEALTH CHECK SCRIPT
 * Run this to verify the entire system is healthy.
 * Command: node scripts/production-health-check.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config({ path: '.env.local' });

async function checkSystem() {
  console.log("🔍 STARLINKNET.WIFI - PRODUCTION HEALTH CHECK\n");

  // 1. Check Database
  try {
    const paymentCount = await prisma.payment.count();
    console.log(`✅ DATABASE: Connected. Found ${paymentCount} total transactions.`);
  } catch (e) {
    console.error("❌ DATABASE: Connection failed!", e.message);
  }

  // 2. Check Environment Variables
  const requiredEnv = [
    'PAYSTACK_SECRET_KEY',
    'MIKROTIK_HOST',
    'MIKROTIK_PORT',
    'NEXT_PUBLIC_BASE_URL'
  ];

  const missing = requiredEnv.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error("❌ ENV: Missing critical variables:", missing.join(", "));
  } else {
    console.log("✅ ENV: All critical variables present.");
  }

  // 3. Check MikroTik Reachability (via current config)
  console.log(`\n📡 Testing Router Connection: ${process.env.MIKROTIK_HOST}:${process.env.MIKROTIK_PORT}...`);
  // Note: This is a simple TCP check, doesn't verify credentials
  const net = require('net');
  const client = new net.Socket();
  client.setTimeout(5000);

  client.connect(process.env.MIKROTIK_PORT, process.env.MIKROTIK_HOST, () => {
    console.log("✅ ROUTER: Tunnel port is OPEN and reachable.");
    client.destroy();
  }).on('error', (err) => {
    console.error("❌ ROUTER: Port is CLOSED. Check if Ngrok is running!");
    client.destroy();
  }).on('timeout', () => {
    console.error("❌ ROUTER: Connection TIMED OUT.");
    client.destroy();
  });

  await prisma.$disconnect();
}

checkSystem();
