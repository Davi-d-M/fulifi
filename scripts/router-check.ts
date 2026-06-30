import { testMikrotikConnection } from '../lib/mikrotik';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log("📡 Testing MikroTik Router Connectivity...");
  console.log(`Target: ${process.env.MIKROTIK_HOST}:${process.env.MIKROTIK_PORT}`);
  console.log("-----------------------------------");

  try {
    const result = await testMikrotikConnection();
    if (result.success) {
      console.log("✅ SUCCESS: Successfully reached your MikroTik Router!");
      console.log(`Router says: ${result.message}`);
      console.log("-----------------------------------");
      console.log("Your router is now FULLY CONNECTED and ready to create vouchers.");
    } else {
      console.error("❌ FAILURE: Could not reach the MikroTik Router.");
      console.error("Error:", result.error);
      console.log("TIP:", result.tip);
    }
  } catch (error: any) {
    console.error("❌ CRASH: An unexpected error occurred.");
    console.error(error.message);
  }
}

main();
