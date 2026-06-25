const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function test() {
  console.log("Attempting connection to Supabase Pooler...");
  const client = new Client({
    connectionString: "postgresql://postgres.oyjzmtiloyknhosskoxx:x5WcuzYmanLnz0V0@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require",
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log("✅ Success! Authenticated and Connected to Pooler.");
    const res = await client.query('SELECT NOW()');
    console.log("DB Time:", res.rows[0]);
    await client.end();
  } catch (err) {
    console.error("❌ Connection failed!");
    console.error("Error:", err.message);
  }
}

test();
