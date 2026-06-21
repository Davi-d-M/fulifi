import { Buffer } from 'buffer';

export async function getMpesaAccessToken() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const baseUrl = process.env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke";
  const url = `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.errorMessage || "Failed to get M-Pesa access token");
  }
  return data.access_token;
}

export async function triggerStkPush(phoneNumber: string, amount: number, accountReference: string) {
  const accessToken = await getMpesaAccessToken();
  const baseUrl = process.env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke";
  const url = `${baseUrl}/mpesa/stkpush/v1/processrequest`;

  const shortCode = process.env.MPESA_BUSINESS_SHORTCODE || "174379";
  const passkey = process.env.MPESA_PASSKEY;
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

  const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/callback`;

  const body = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(amount),
    PartyA: phoneNumber,
    PartyB: shortCode,
    PhoneNumber: phoneNumber,
    CallBackURL: callbackUrl,
    AccountReference: accountReference,
    TransactionDesc: "WiFi Access Payment"
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  return await response.json();
}
