import https from 'https';
import http from 'http';
import { ProductCategory } from '@/types/product';

export interface ExtractedProduct {
  title: string;
  brand: string;
  store: string;
  category: ProductCategory;
  subcategory?: string;
  price: number;
  originalPrice?: number;
  image: string;
  description: string;
  affiliateUrl: string;
}

/**
 * Fetches HTML following HTTP & JS redirects with a browser-like User Agent
 */
async function fetchHtml(initialUrl: string): Promise<{ finalUrl: string; html: string }> {
  return new Promise((resolve, reject) => {
    function get(urlStr: string, redirectsRemaining = 6) {
      if (redirectsRemaining <= 0) {
        return reject(new Error('Too many redirects encountered'));
      }

      try {
        const parsed = new URL(urlStr);
        const client = parsed.protocol === 'https:' ? https : http;

        const req = client.get(
          urlStr,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          },
          (res) => {
            if (
              res.statusCode &&
              [301, 302, 303, 307, 308].includes(res.statusCode) &&
              res.headers.location
            ) {
              const redirectUrl = new URL(res.headers.location, urlStr).toString();
              return get(redirectUrl, redirectsRemaining - 1);
            }

            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              // Check for affiliate redirect script (like EarnKaro/techtrack/cashbackUrl)
              const jsRedirectMatch = data.match(/var cashbackUrl = "(https:[^"]+)"/);
              if (jsRedirectMatch && jsRedirectMatch[1]) {
                const nestedUrl = jsRedirectMatch[1];
                const matchUrlParam = nestedUrl.match(/[?&]url=([^&]+)/);
                if (matchUrlParam) {
                  const targetUrl = decodeURIComponent(matchUrlParam[1]);
                  return get(targetUrl, redirectsRemaining - 1);
                }
                return get(nestedUrl, redirectsRemaining - 1);
              }

              resolve({ finalUrl: urlStr, html: data });
            });
          }
        );

        req.on('error', reject);
        req.setTimeout(12000, () => {
          req.destroy();
          reject(new Error('Request timed out'));
        });
      } catch (err) {
        reject(err);
      }
    }

    get(initialUrl);
  });
}

function detectStore(urlStr: string): string {
  const lower = urlStr.toLowerCase();
  if (lower.includes('myntra') || lower.includes('myntr.it')) return 'Myntra';
  if (lower.includes('zara')) return 'Zara';
  if (lower.includes('amazon') || lower.includes('amzn.to')) return 'Amazon';
  if (lower.includes('nykaa')) return 'Nykaa';
  if (lower.includes('mango')) return 'Mango';
  if (lower.includes('ajio')) return 'Ajio';
  if (lower.includes('h&m') || lower.includes('hm.com')) return 'H&M';
  if (lower.includes('meesho')) return 'Meesho';
  if (lower.includes('sephora')) return 'Sephora';
  if (lower.includes('massimodutti')) return 'Massimo Dutti';
  if (lower.includes('tira')) return 'Tira Beauty';
  return 'Official Store';
}

function detectCategory(text: string): ProductCategory {
  const lower = text.toLowerCase();
  if (
    lower.includes('shoe') ||
    lower.includes('sneaker') ||
    lower.includes('heel') ||
    lower.includes('sandal') ||
    lower.includes('boot') ||
    lower.includes('footwear')
  ) {
    return 'footwear';
  }
  if (
    lower.includes('serum') ||
    lower.includes('cream') ||
    lower.includes('lipstick') ||
    lower.includes('makeup') ||
    lower.includes('beauty') ||
    lower.includes('cleanser') ||
    lower.includes('perfume') ||
    lower.includes('sunscreen')
  ) {
    return 'beauty';
  }
  if (
    lower.includes('bag') ||
    lower.includes('tote') ||
    lower.includes('earring') ||
    lower.includes('necklace') ||
    lower.includes('jewel') ||
    lower.includes('watch') ||
    lower.includes('sunglasses') ||
    lower.includes('accessory') ||
    lower.includes('accessories')
  ) {
    return 'accessories';
  }
  if (
    lower.includes('decor') ||
    lower.includes('candle') ||
    lower.includes('home') ||
    lower.includes('lifestyle') ||
    lower.includes('journal')
  ) {
    return 'lifestyle';
  }
  return 'fashion';
}

const KNOWN_BRANDS = [
  'Tommy Hilfiger', 'Calvin Klein', 'Polo Ralph Lauren', 'Ralph Lauren',
  'Marks & Spencer', 'Vero Moda', 'Jack & Jones', 'Under Armour', 'Louis Philippe',
  'Van Heusen', 'Peter England', 'Allen Solly', 'Tokyo Talkies', 'Global Desi',
  'Fabindia', 'Zara', 'H&M', 'Mango', 'Levis', "Levi's", 'Nike', 'Adidas',
  'Puma', 'Inddus', 'Libas', 'Biba', 'Only', 'Forever 21', 'Skechers', 'Crocs',
  'Aldo', 'Charles & Keith', 'Fossil', 'Casio', 'Titan', 'Nykaa', 'Lakme',
  'Maybelline', 'Loreal', "L'Oreal", 'Minimalist', 'Plum', 'Dot & Key',
  'Roadster', 'HRX', 'W', 'Aurelia', 'AND', 'Anouk', 'Soch', 'Sassafras',
  'Berrylush', 'Street 9', 'Code', 'Melange', 'Kazo', 'Madame', 'Gant',
  'Nautica', 'US Polo Assn', 'U.S. Polo Assn.', 'Arrow', 'Raymond', 'Superdry',
  'American Eagle', 'Aeropostale', 'Pepe Jeans', 'Wrangler', 'Lee', 'Spykar',
  'Flying Machine', 'Mufti', 'Bata', 'Woodland', 'Red Tape', 'Campus'
];

const ERROR_TITLES = [
  'access denied',
  '403 forbidden',
  '404 not found',
  'page not found',
  'just a moment',
  'attention required',
  'robot check',
  'security check',
  'cloudflare',
  'blocked',
  'ajio direct',
  'ajio.com',
  'myntra.com',
  'amazon.in',
  'error',
  'loading',
  'untitled'
];

function isInvalidTitle(title: string): boolean {
  if (!title || title.trim().length < 3) return true;
  const t = title.toLowerCase().trim();
  return ERROR_TITLES.some((err) => t === err || t.includes(err));
}

function cleanHtmlText(raw: string): string {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Intelligent URL Slug Parser: Extracts clean title, brand, and category
 * directly from e-commerce URLs when server scraping is blocked by anti-bot CDN.
 */
function parseProductFromUrl(
  targetUrl: string,
  store: string,
  originalAffiliateUrl: string
): ExtractedProduct {
  let resolvedUrl = targetUrl;
  try {
    const parsed = new URL(targetUrl);
    // Check if there is a nested dl= or url= parameter (EarnKaro, Techtrack, etc.)
    const dlParam = parsed.searchParams.get('dl') || parsed.searchParams.get('url');
    if (dlParam) {
      resolvedUrl = decodeURIComponent(dlParam);
    }
  } catch {}

  let slug = '';
  try {
    const urlObj = new URL(resolvedUrl);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    // Look for product slug segment (e.g. /tommy-hilfiger-women-striped-relaxed-fit-shirt/p/703093754_green)
    const candidate = pathParts.find(
      (p) => p.includes('-') && !p.startsWith('p') && p.length > 5 && !p.endsWith('.html')
    );
    slug = candidate || pathParts[pathParts.length - 1] || pathParts[0] || 'Curated Product';
  } catch {
    slug = 'Curated Product';
  }

  // Clean slug: remove trailing .html, /buy, or _color suffixes
  slug = slug
    .replace(/\.html$/i, '')
    .replace(/\/buy$/i, '')
    .replace(/_.*$/, '');

  const words = slug.split(/[-_]/).filter(Boolean);
  const formattedTitle = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  // Detect brand using dictionary matching
  let brand = store;
  for (const b of KNOWN_BRANDS) {
    const slugNorm = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
    const brandNorm = b.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (slugNorm.startsWith(brandNorm)) {
      brand = b;
      break;
    }
  }
  if (brand === store && words.length >= 2) {
    brand = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  }

  const category = detectCategory(slug);

  return {
    title: formattedTitle || 'Curated Pick',
    brand,
    store,
    category,
    price: 0,
    image: '',
    description: `Curated ${formattedTitle} by ${brand}. Available at ${store}.`,
    affiliateUrl: originalAffiliateUrl,
  };
}

/**
 * Main extractor: Takes any affiliate or merchant URL and extracts product attributes
 */
export async function extractProductFromUrl(inputUrl: string): Promise<ExtractedProduct> {
  const cleanUrl = inputUrl.trim();
  const store = detectStore(cleanUrl);

  try {
    const { finalUrl, html } = await fetchHtml(cleanUrl);
    const resolvedStore = detectStore(finalUrl) || store;

    // --- 1. Myntra Specialized Parser (pdpData) ---
    if (finalUrl.includes('myntra.com') || resolvedStore === 'Myntra') {
      const pdpIndex = html.indexOf('"pdpData":');
      if (pdpIndex !== -1) {
        const sub = html.slice(pdpIndex);
        const endScript = sub.indexOf('</script>');
        const jsonStr = '{' + sub.slice(0, endScript > 0 ? endScript : 200000);
        try {
          const parsed = JSON.parse(jsonStr);
          const pdp = parsed.pdpData;
          if (pdp && pdp.name && !isInvalidTitle(pdp.name)) {
            let img =
              pdp.media?.albums?.[0]?.images?.[0]?.imageURL ||
              pdp.media?.albums?.[0]?.images?.[0]?.secure_url ||
              '';
            if (img && img.startsWith('http://')) {
              img = img.replace('http://', 'https://');
            }

            const title = cleanHtmlText(pdp.name);
            const brand = pdp.brand?.name ? cleanHtmlText(pdp.brand.name) : 'Myntra';
            const price = pdp.price?.discounted || pdp.price?.mrp || 0;
            const originalPrice = pdp.price?.mrp && pdp.price.mrp > price ? pdp.price.mrp : undefined;

            return {
              title,
              brand,
              store: 'Myntra',
              category: detectCategory(`${title} ${finalUrl}`),
              price: Number(price),
              originalPrice: originalPrice ? Number(originalPrice) : undefined,
              image: img,
              description: `Styled and curated from Myntra. High-quality ${title} by ${brand}.`,
              affiliateUrl: cleanUrl,
            };
          }
        } catch {
          // Fall through
        }
      }
    }

    // --- 2. JSON-LD Schema.org parser ---
    const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);
    if (jsonLdMatches) {
      for (const block of jsonLdMatches) {
        const rawJson = block.replace(/<\/?script[^>]*>/gi, '').trim();
        try {
          const parsed = JSON.parse(rawJson);
          const item = parsed['@graph'] ? parsed['@graph'].find((g: any) => g['@type'] === 'Product') : parsed;
          if (item && (item['@type'] === 'Product' || item.name)) {
            const rawTitle = cleanHtmlText(item.name || '');
            if (rawTitle && !isInvalidTitle(rawTitle)) {
              let img = Array.isArray(item.image) ? item.image[0] : item.image;
              if (typeof img === 'object' && img?.url) img = img.url;
              if (img && typeof img === 'string' && img.startsWith('http://')) {
                img = img.replace('http://', 'https://');
              }

              let price = 0;
              if (item.offers) {
                const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                price = Number(offer.price || offer.lowPrice || 0);
              }

              const brand = typeof item.brand === 'object' ? item.brand?.name : item.brand || resolvedStore;

              return {
                title: rawTitle,
                brand: cleanHtmlText(brand || resolvedStore),
                store: resolvedStore,
                category: detectCategory(`${rawTitle} ${finalUrl}`),
                price: price || 0,
                image: typeof img === 'string' ? img : '',
                description: item.description ? cleanHtmlText(item.description).slice(0, 160) : `Curated from ${resolvedStore}.`,
                affiliateUrl: cleanUrl,
              };
            }
          }
        } catch {
          // continue
        }
      }
    }

    // --- 3. OpenGraph / Twitter Meta Tags parser ---
    const ogTitleMatch =
      html.match(/<meta\s+(?:property|name)=["'](?:og:title|twitter:title)["']\s+content=["'](.*?)["']/i) ||
      html.match(/<title>(.*?)<\/title>/i);
    const ogImageMatch = html.match(
      /<meta\s+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["']\s+content=["'](.*?)["']/i
    );
    const ogDescMatch = html.match(
      /<meta\s+(?:property|name)=["'](?:og:description|twitter:description|description)["']\s+content=["'](.*?)["']/i
    );
    const ogPriceMatch = html.match(
      /<meta\s+property=["'](?:product:price:amount|og:price:amount)["']\s+content=["'](.*?)["']/i
    );

    let title = ogTitleMatch ? cleanHtmlText(ogTitleMatch[1]) : '';
    title = title.split(/[|•–—]/)[0].trim();

    // Check if title is valid and not an error/block like "Access Denied"
    if (title && !isInvalidTitle(title)) {
      let image = ogImageMatch ? ogImageMatch[1].trim() : '';
      if (image.startsWith('http://')) {
        image = image.replace('http://', 'https://');
      }
      // Filter out generic store logos
      if (image.includes('ajio-store') || image.includes('default-og') || image.includes('store-logo')) {
        image = '';
      }

      const price = ogPriceMatch ? parseFloat(ogPriceMatch[1]) : 0;
      const desc = ogDescMatch ? cleanHtmlText(ogDescMatch[1]).slice(0, 160) : '';

      return {
        title,
        brand: resolvedStore,
        store: resolvedStore,
        category: detectCategory(`${title} ${desc}`),
        price: isNaN(price) ? 0 : price,
        image,
        description: desc || `Curated pick from ${resolvedStore}.`,
        affiliateUrl: cleanUrl,
      };
    }

    // --- 4. Fallback to Deep URL Slug Parsing (for Ajio and protected stores) ---
    return parseProductFromUrl(finalUrl || cleanUrl, resolvedStore, cleanUrl);
  } catch {
    // If entire request failed, fallback to URL parsing
    return parseProductFromUrl(cleanUrl, store, cleanUrl);
  }
}
