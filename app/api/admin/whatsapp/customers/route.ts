import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId') || 'default-site';

    // Fetch all successful payments to get phone numbers
    // We filter for distinct phone numbers
    const payments = await prisma.payment.findMany({
      where: {
        siteId: siteId,
        status: 'active', // Or any status that indicates a real customer
        phoneNumber: {
            not: null,
            notIn: ['Unknown', 'N/A', '']
        }
      },
      select: {
        phoneNumber: true,
        amount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Process into a unique list of customers
    const customerMap = new Map();
    payments.forEach(p => {
      if (!customerMap.has(p.phoneNumber)) {
        customerMap.set(p.phoneNumber, {
          phone: p.phoneNumber,
          totalSpent: p.amount,
          lastPayment: p.createdAt,
          paymentCount: 1
        });
      } else {
        const existing = customerMap.get(p.phoneNumber);
        existing.totalSpent += p.amount;
        existing.paymentCount += 1;
        if (new Date(p.createdAt) > new Date(existing.lastPayment)) {
          existing.lastPayment = p.createdAt;
        }
      }
    });

    const customers = Array.from(customerMap.values());

    return NextResponse.json({
        success: true,
        count: customers.length,
        customers: customers
    });

  } catch (error: any) {
    console.error("[WhatsApp Customers] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
