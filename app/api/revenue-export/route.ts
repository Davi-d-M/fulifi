import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/revenue-export
 * Export revenue data as CSV
 * Query params: format=csv|json, period=today|week|month|custom, startDate, endDate
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'csv';
    const period = searchParams.get('period') || 'today';
    const siteId = searchParams.get('siteId') || 'default-site';

    const now = new Date();
    let startDate = new Date();

    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate.setDate(now.getDate() - 30);
    } else if (period === 'custom') {
      const customStart = searchParams.get('startDate');
      if (customStart) startDate = new Date(customStart);
    }

    // Get payments
    const payments = await prisma.payment.findMany({
      where: {
        siteId,
        createdAt: { gte: startDate, lte: now },
      },
      include: { offer: true },
      orderBy: { createdAt: 'desc' },
    });

    // Get connections
    const connections = await prisma.deviceConnection.findMany({
      where: {
        siteId,
        connectedAt: { gte: startDate, lte: now },
      },
    });

    if (format === 'csv') {
      // Create CSV
      let csv = 'Date,Transaction Ref,Phone Number,Amount (KES),Voucher Code,Package,Status,Device MAC\n';

      payments.forEach(p => {
        const date = new Date(p.createdAt).toLocaleString();
        const row = [
          date,
          p.transactionRef || '',
          p.phoneNumber || '',
          p.amount,
          p.voucherCode,
          p.offer?.name || 'Unknown',
          p.status,
          '', // MAC will be empty without connection link
        ];
        csv += `"${row.join('","')}"\n`;
      });

      // Add summary
      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
      const totalTransactions = payments.length;
      csv += `\nSummary\n`;
      csv += `Total Transactions,${totalTransactions}\n`;
      csv += `Total Revenue,${totalRevenue.toFixed(2)}\n`;
      csv += `Period,"${startDate.toLocaleDateString()} - ${now.toLocaleDateString()}"\n`;

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="revenue-${period}-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // JSON format
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const uniqueDevices = new Set(connections.map(c => c.macAddress)).size;

    return NextResponse.json({
      success: true,
      period,
      dateRange: { start: startDate, end: now },
      summary: {
        totalTransactions: payments.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalSessions: connections.length,
        uniqueDevices,
        averageTransactionValue: payments.length > 0 ? Math.round((totalRevenue / payments.length) * 100) / 100 : 0,
      },
      transactions: payments.map(p => ({
        date: p.createdAt,
        transactionRef: p.transactionRef,
        phoneNumber: p.phoneNumber,
        amount: p.amount,
        voucherCode: p.voucherCode,
        package: p.offer?.name,
        status: p.status,
      })),
    });
  } catch (error: any) {
    console.error('[Revenue Export] Error:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
