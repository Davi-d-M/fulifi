import { NextRequest, NextResponse } from "next/server";
// This is the new import you were looking for! It pulls in our catalog config
import { WIFI_BILLING_CATALOG } from "@/app/config/packages"; 

export async function POST(req: NextRequest) {
  try {
    // 1. Parse the incoming request body data from the frontend
    const body = await req.json().catch(() => ({}));
    const { phoneNumber, packageId } = body;

    // 2. Validate that both inputs are present
    if (!phoneNumber || !packageId) {
      return NextResponse.json(
        { success: false, error: "Missing phoneNumber or packageId parameters." }, 
        { status: 400 }
      );
    }

    // 3. Look up the genuine data tier configuration safely on the server side
    const selectedPackage = WIFI_BILLING_CATALOG[packageId];
    if (!selectedPackage) {
      return NextResponse.json(
        { success: false, error: "The chosen billing profile index does not exist." }, 
        { status: 400 }
      );
    }

    // Assign the strict price variable dynamically from the catalog
    const billingAmount = selectedPackage.price;

    // 4. Daraja Credentials Handshake
    const consumerKey = "0ilwviIah8q6Co7pbqIUJWRGKqcaDQ0EDqGc9TYrC7TphGIU".trim();
    const consumerSecret = "XNhFNqLiEZPA5tVlrxM4biy3wYCQM0GUHkaHwEcsliN7hE9RGQD7gAgUj8BmARib".trim();
    const authCredentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    const tokenResponse = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${authCredentials}`,
          "Cache-Control": "no-cache",
        },
      }
    );

    if (!tokenResponse.ok) {
      return NextResponse.json({ success: false, error: "Safaricom OAuth Handshake Refused." }, { status: 401 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 5. Format the Phone Number structure cleanly
    let formattedPhone = phoneNumber.replace(/[^0-9]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.substring(1);
    }

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const shortCode = "174379"; 
    const passKey = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"; 
    const password = Buffer.from(`${shortCode}${passKey}${timestamp}`).toString("base64");

    // 6. Fire dynamic STK Push Payload using configuration metadata
    const stkPayload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: billingAmount.toString(), // Securely uses the verified price fetched from your config catalog
      PartyA: formattedPhone,
      PartyB: shortCode,
      PhoneNumber: formattedPhone,
      CallBackURL: "https://mydomain.com/api/callback", 
AccountReference: `FULIFI_WIFI_${selectedPackage.id.toUpperCase()}`,      TransactionDesc: `Fulifi Wi-Fi Package activation tier: ${selectedPackage.id}`,
    };

    const mpesaResponse = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkPayload),
      }
    );

    const mpesaData = await mpesaResponse.json();

    return NextResponse.json({
      success: mpesaResponse.ok,
      safaricom_gateway_response: mpesaData
    });

  } catch (globalError: any) {
    return NextResponse.json({ success: false, internal_exception: globalError.message }, { status: 500 });
  }
}