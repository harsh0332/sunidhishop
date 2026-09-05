import crypto from 'crypto';

export interface AttributionContext {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  contentId?: string;
  campaignId?: string;
  source: string;
  sessionId: string;
}

export function normalizeMerchant(store: string, brand?: string): string {
  const input = (store || brand || 'unknown').toLowerCase().trim();

  if (input.includes('zara')) return 'zara';
  if (input.includes('mango')) return 'mango';
  if (input.includes('massimo')) return 'massimodutti';
  if (input.includes('nykaa')) return 'nykaa';
  if (input.includes('sephora')) return 'sephora';
  if (input.includes('h&m') || input.includes('hm')) return 'hm';
  if (input.includes('mejuri')) return 'mejuri';
  if (input.includes('charles')) return 'charleskeith';
  if (input.includes('tatacliq') || input.includes('tata cliq')) return 'tatacliq';
  if (input.includes('myntra')) return 'myntra';
  if (input.includes('ajio')) return 'ajio';
  if (input.includes('amazon')) return 'amazon';
  if (input.includes('flipkart')) return 'flipkart';
  if (input.includes('cos')) return 'cos';
  if (input.includes('vitruvi')) return 'vitruvi';
  if (input.includes('sol de janeiro')) return 'soldejaneiro';

  // Fallback: strip spaces and non-alphanumeric chars
  return input.replace(/[^a-z0-9]/g, '');
}

/**
 * Generates a privacy-preserving anonymous session hash without collecting raw IP
 */
export function generateAnonymousSessionId(userAgent: string, referrer: string): string {
  const today = new Date().toISOString().slice(0, 10); // rotates daily
  const seed = `${userAgent}_${referrer}_${today}`;
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16);
}

/**
 * Extracts attribution tags from incoming URL parameters
 */
export function extractAttribution(url: URL, referrer: string, userAgent: string): AttributionContext {
  const p = url.searchParams;

  const utmSource = p.get('utm_source') || undefined;
  const utmMedium = p.get('utm_medium') || undefined;
  const utmCampaign = p.get('utm_campaign') || undefined;
  const utmContent = p.get('utm_content') || undefined;
  const utmTerm = p.get('utm_term') || undefined;

  // Creator content attribution (Instagram Reels, lookbooks, stories)
  const contentId = p.get('content') || p.get('creator_content') || p.get('reel') || p.get('content_id') || undefined;
  const campaignId = p.get('campaign') || p.get('campaign_id') || utmCampaign || undefined;

  // Infer default source from referrer if no utm_source provided
  let source = utmSource || 'direct';
  if (!utmSource && referrer) {
    if (referrer.includes('instagram.com')) source = 'instagram';
    else if (referrer.includes('facebook.com')) source = 'facebook';
    else if (referrer.includes('google.com')) source = 'google';
    else if (referrer.includes('youtube.com')) source = 'youtube';
    else if (referrer.includes('pinterest.com')) source = 'pinterest';
    else source = 'external-web';
  }

  const sessionId = generateAnonymousSessionId(userAgent, referrer);

  return {
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    contentId,
    campaignId,
    source,
    sessionId,
  };
}
