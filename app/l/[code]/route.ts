import { NextRequest, NextResponse } from 'next/server';
import { contentRepository } from '@/lib/data/content-repository';

interface ShortlinkContext {
  params: {
    code: string;
  };
}

export const dynamic = 'force-dynamic';

/**
 * Lightweight future-ready shortlink resolution router.
 * Translates short aliases (e.g. /l/reel27, /l/festive) into clean content or campaign destinations.
 */
export async function GET(request: NextRequest, { params }: ShortlinkContext) {
  const code = (params.code || '').toLowerCase().trim();

  if (!code) {
    return NextResponse.redirect(new URL('/', request.url), 307);
  }

  // 1. Check if matches content (e.g. reel_027, reel-027, reel27)
  const normalizedContentId = code.startsWith('reel') && !code.includes('_') && !code.includes('-')
    ? `reel_${code.replace('reel', '')}`
    : code;

  const content = await contentRepository.getContentById(normalizedContentId);
  if (content) {
    return NextResponse.redirect(new URL(`/content/${content.id}`, request.url), 307);
  }

  // 2. Check if matches campaign (e.g. festive, festive_2026)
  const campaigns = await contentRepository.getAllCampaigns();
  const matchedCampaign = campaigns.find(
    (c) => c.id.toLowerCase() === code || c.id.toLowerCase().includes(code)
  );

  if (matchedCampaign) {
    return NextResponse.redirect(new URL(`/campaign/${matchedCampaign.id}`, request.url), 307);
  }

  // 3. Fallback to homepage with context parameter
  return NextResponse.redirect(new URL(`/?content=${encodeURIComponent(code)}`, request.url), 307);
}
