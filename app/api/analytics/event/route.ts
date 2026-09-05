import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { EventTracker } from '@/lib/analytics/event-tracker';
import { classifyTrafficType, detectDeviceType } from '@/lib/analytics/bot-detector';
import { AnalyticsEvent, StandardAnalyticsEventName } from '@/types/analytics';

export const dynamic = 'force-dynamic';

function generateSessionId(request: NextRequest, userAgent: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';
  const today = new Date().toISOString().slice(0, 10);
  return crypto.createHash('sha256').update(`${ip}_${userAgent}_${today}`).digest('hex').substring(0, 16);
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    if (!rawBody || !rawBody.trim()) {
      return NextResponse.json({ error: 'Empty payload' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const eventType = (payload.eventType || payload.event) as StandardAnalyticsEventName;
    if (!eventType) {
      return NextResponse.json({ error: 'Missing eventType' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') || payload.userAgent || '';
    const trafficType = payload.trafficType || classifyTrafficType(userAgent);
    const deviceType = payload.deviceType || detectDeviceType(userAgent);
    const sessionId = payload.sessionId || generateSessionId(request, userAgent);

    const event: AnalyticsEvent = {
      id: crypto.randomUUID(),
      eventType,
      timestamp: payload.timestamp || new Date().toISOString(),
      sessionId,
      productId: payload.productId,
      productSlug: payload.productSlug,
      productTitle: payload.productTitle,
      category: payload.category,
      subcategory: payload.subcategory,
      brand: payload.brand,
      store: payload.store || payload.merchant,
      merchant: payload.merchant || payload.store,
      price: typeof payload.price === 'number' ? payload.price : undefined,
      source: payload.source,
      referrer: payload.referrer,
      deviceType,
      trafficType,
      utmSource: payload.utmSource,
      utmMedium: payload.utmMedium,
      utmCampaign: payload.utmCampaign,
      utmContent: payload.utmContent,
      utmTerm: payload.utmTerm,
      contentId: payload.contentId,
      campaignId: payload.campaignId,
      searchQuery: payload.searchQuery,
      createdAt: new Date().toISOString(),
    };

    EventTracker.recordEvent(event);

    return NextResponse.json({ success: true, eventId: event.id }, { status: 200 });
  } catch {
    // Fail-safe: telemetry must never leak errors or fail catastrophically
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
