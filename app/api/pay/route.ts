import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WIFI_BILLING_CATALOG } from '@/app/config/packages';
import { triggerStkPush } from '@/lib/mpesa';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  console.log("[Pay] Starting M-Pesa STK Push process...");

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request data" }, { status: 400 });

    const { phoneNumber, packageId, email, mac, ip, siteId } = body;

    if (!phoneNumber || !packageId) {
      return NextResponse.json({ error: "Missing phoneNumber or packageId" }, { status: 400 });
    }

    const currentSite = siteId || 'default-site';

    // 1. Resolve Package
    const dbOffer = await prisma.voucherOffer.findUnique({ where: { id: packageId } }).catch(() => null);
    const staticPkg = WIFI_BILLING_CATALOG[packageId];

    const price = dbOffer?.price || staticPkg?.price || 0;
    const name = dbOffer?.name || staticPkg?.name || "WiFi Plan";

    if (price <= 0) return NextResponse.json({ error: "The selected package is unavailable." }, { status: 400 });

    // 2. Format Phone Number (expecting 254...)
    let formattedPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) {
      formattedPhone = '254' + formattedPhone;
    } else if (formattedPhone.length < 10) {
        return NextResponse.json({ error: "Invalid phone number format." }, { status: 400 });
    }

    // 3. Trigger STK Push
    const mpesaResponse = await triggerStkPush(formattedPhone, price, name);

    if (mpesaResponse.ResponseCode !== "0") {
      console.error("[M-Pesa Error]", mpesaResponse);
      return NextResponse.json({ error: mpesaResponse.CustomerMessage || "M-Pesa failed to initialize STK Push." }, { status: 400 });
    }

    const checkoutRequestID = mpesaResponse.CheckoutRequestID;

    // 4. Store a pending payment record
    await prisma.payment.create({
      data: {
        transactionRef: checkoutRequestID,
        amount: price,
        phoneNumber: formattedPhone,
        voucherCode: 'PENDING',
        offerId: dbOffer ? packageId : null,
        status: 'pending',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min window
        siteId: currentSite,
        resultDesc: `STK Push initiated for ${name}`
      }
    }).catch(err => console.error("[Pay] Prisma Error:", err.message));

    // Also store a PaymentEvent for tracking
    await prisma.paymentEvent.create({
      data: {
        externalReference: checkoutRequestID,
        phoneNumber: formattedPhone,
        amount: price,
        status: 'PENDING',
        macAddress: mac,
        ipAddress: ip,
        offerId: dbOffer ? packageId : null,
        siteId: currentSite
      }
    }).catch(() => {});

    return NextResponse.json({
      status: "success",
      reference: checkoutRequestID,
      customerMessage: mpesaResponse.CustomerMessage
    });

  } catch (error: any) {
    console.error("[Pay] Checkout Crash:", error.message);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
