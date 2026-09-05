import { DeviceType, TrafficType } from '@/types/analytics';

const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /googlebot/i,
  /bingbot/i,
  /yahoo/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /linkedinbot/i,
  /slackbot/i,
  /applebot/i,
  /pinterest/i,
  /curl/i,
  /wget/i,
  /python/i,
  /headless/i,
  /phantomjs/i,
  /postman/i,
  /go-http-client/i,
];

export function classifyTrafficType(userAgent: string): TrafficType {
  if (!userAgent || userAgent.trim().length === 0) {
    return 'unknown';
  }

  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(userAgent)) {
      return 'bot';
    }
  }

  return 'human';
}

export function detectDeviceType(userAgent: string): DeviceType {
  if (!userAgent) return 'unknown';

  const ua = userAgent.toLowerCase();

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }

  if (
    /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(
      ua
    )
  ) {
    return 'mobile';
  }

  return 'desktop';
}
