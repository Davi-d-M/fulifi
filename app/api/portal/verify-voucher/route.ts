import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkMikrotikUserExists, createMikrotikVoucher } from '@/lib/mikrotik';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function POST(request: Request) {
  try {
    const { inputCode, macAddress, ipAddress } = await request.json();

    if (!inputCode) {
      return NextResponse.json({ success: false, message: "Missing voucher code" }, { status: 400 });
    }

    // 1. Check if it's an active payment voucher
    let payment = await prisma.payment.findFirst({
      where: {
        voucherCode: inputCode,
        status: 'active',
        expiresAt: {
          gt: new Date()
        }
      }
    });

    // 2. If not found in payments, check if it's an unused physical bulk voucher
    if (!payment) {
      const bulkVoucher = await prisma.bulkVoucher.findUnique({
        where: { voucherCode: inputCode, isUsed: false },
        include: { offer: true }
      });

      if (bulkVoucher) {
        // ACTIVATE PHYSICAL VOUCHER
        const expiresAt = new Date(Date.now() + bulkVoucher.offer.durationMin * 60 * 1000);

        const [updatedBulk, newPayment] = await prisma.$transaction([
          prisma.bulkVoucher.update({
            where: { id: bulkVoucher.id },
            data: { isUsed: true }
          }),
          prisma.payment.create({
            data: {
              voucherCode: inputCode,
              amount: bulkVoucher.offer.price,
              offerId: bulkVoucher.offerId,
              status: 'active',
              expiresAt: expiresAt,
              phoneNumber: 'PHYSICAL_VOUCHER',
              transactionRef: `MANUAL-${inputCode}`
            }
          }),
          prisma.voucher.create({
            data: {
              code: inputCode,
              durationMin: bulkVoucher.offer.durationMin,
              price: bulkVoucher.offer.price,
              isUsed: true,
              activatedAt: new Date()
            }
          }),
          prisma.paymentEvent.create({
            data: {
              externalReference: `MANUAL-${inputCode}`,
              phoneNumber: 'PHYSICAL_VOUCHER',
              amount: bulkVoucher.offer.price,
              status: 'SUCCESS',
              resultDesc: `Physical Voucher Activated: ${bulkVoucher.offer.name}`
            }
          })
        ]);

        payment = newPayment;

        // Provision on Router
        await createMikrotikVoucher(
          inputCode,
          bulkVoucher.offerId,
          bulkVoucher.offer.durationMin,
          bulkVoucher.offer.expiryMode,
          macAddress
        );

        console.log(`✅ Physical Voucher Activated: ${inputCode}`);
      }
    }

    if (!payment) {
      return NextResponse.json({
        success: false,
        message: "Invalid or expired code. Please purchase a new bundle."
      }, { status: 404 });
    }

    // 3. Cross-reference with Router & Record Session
    try {
      const userExistsOnRouter = await checkMikrotikUserExists(inputCode);

      if (!userExistsOnRouter) {
        const dbOffer = payment.offerId ? await prisma.voucherOffer.findUnique({ where: { id: payment.offerId } }) : null;
        const durationLeftMin = Math.max(0, Math.floor((payment.expiresAt.getTime() - Date.now()) / 60000));

        await createMikrotikVoucher(
          inputCode,
          payment.offerId || '1hr',
          durationLeftMin || dbOffer?.durationMin || 60,
          dbOffer?.expiryMode || 'CONTINUOUS',
          macAddress,
          dbOffer?.speedLimit || "5M/5M"
        );
      }

      // Record this session in our DB so it shows on Admin Dashboard
      if (macAddress) {
        await prisma.activeSession.upsert({
          where: { macAddress },
          update: {
            voucherCode: inputCode,
            expiresAt: payment.expiresAt,
            deviceType: 'PHONE'
          },
          create: {
            macAddress,
            ipAddress: ipAddress || '0.0.0.0',
            voucherCode: inputCode,
            deviceType: 'PHONE',
            expiresAt: payment.expiresAt
          }
        });
      }
    } catch (netErr: any) {
      console.error("[Self-Heal] Router unreachable:", netErr.message);
      return NextResponse.json({
        success: true,
        message: "Voucher confirmed, but local hotspot node is offline."
      });
    }

    return NextResponse.json({
      success: true,
      message: "Access Granted. You are now connected."
    });

  } catch (error: any) {
    console.error("[Verify-Voucher] Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
