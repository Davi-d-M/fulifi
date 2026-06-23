import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/alerts
 * Create admin alert
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, severity = 'MEDIUM', title, message, data, siteId = 'default-site' } = body;

    if (!type || !title || !message) {
      return NextResponse.json({ error: 'type, title, message required' }, { status: 400 });
    }

    const alert = await prisma.adminAlert.create({
      data: {
        type,
        severity,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
        siteId,
      },
    });

    console.log(`[Alert] ${severity} | ${type}: ${title}`);
    return NextResponse.json({ success: true, alert });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

/**
 * GET /api/alerts
 * Get alerts (unread, all, or by severity)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'unread'; // unread, all, critical
    const siteId = searchParams.get('siteId') || 'default-site';
    const limit = parseInt(searchParams.get('limit') || '50');

    let where: any = { siteId };

    if (filter === 'unread') {
      where.read = false;
    } else if (filter === 'critical') {
      where.severity = 'CRITICAL';
    }

    const alerts = await prisma.adminAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      filter,
      count: alerts.length,
      alerts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

/**
 * PUT /api/alerts
 * Mark alert as read
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { alertId } = body;

    if (!alertId) {
      return NextResponse.json({ error: 'alertId required' }, { status: 400 });
    }

    const updated = await prisma.adminAlert.update({
      where: { id: alertId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, alert: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
