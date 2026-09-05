import {
  CatalogHealthSummary,
  CreatorContentType,
  Product,
  ProductCategory,
  ProductHealthGrade,
  ProductHealthIssue,
  ProductHealthReport,
  ProductStatus,
} from '@/types/product';

export interface ValidationResult {
  isValid: boolean;
  isBlank: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Sanitizes plain text to prevent HTML/script injection and spreadsheet formula injection.
 * Treats all sheet content strictly as inert data.
 */
export function sanitizeText(input: unknown): string {
  if (input === null || input === undefined) return '';
  let str = String(input).trim();
  
  // Strip out HTML tags
  str = str.replace(/<[^>]*>?/gm, '');

  // Prevent spreadsheet formula injection (=, +, @, or dangerous leading hyphens like -cmd)
  if (str.startsWith('=') || str.startsWith('+') || str.startsWith('@')) {
    str = str.replace(/^[=+@]+/, '').trim();
  }

  return str.trim();
}

/**
 * Validates and sanitizes a URL.
 * Strictly permits only http and https schemes. Rejects dangerous schemes like javascript:, data:, etc.
 */
export function sanitizeUrl(input: unknown): string | undefined {
  if (!input) return undefined;
  const str = String(input).trim();
  if (!str) return undefined;

  try {
    const parsed = new URL(str);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    // eslint-disable-next-line no-console
    console.warn(`[Security Warning] Rejected unsafe URL protocol: ${str}`);
    return undefined;
  } catch {
    // Relative path support (e.g. /images/fallback.jpg)
    if (str.startsWith('/') && !str.startsWith('//')) {
      return str;
    }
    return undefined;
  }
}

/**
 * Parses boolean representations from human-maintained spreadsheet cells:
 * Accepts TRUE, FALSE, true, false, Yes, No, 1, 0, y, n (case-insensitive)
 */
export function parseBoolean(value: unknown, defaultValue: boolean = false): boolean {
  if (value === null || value === undefined || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;

  const str = String(value).trim().toLowerCase();
  if (str === 'true' || str === '1' || str === 'yes' || str === 'y') return true;
  if (str === 'false' || str === '0' || str === 'no' || str === 'n') return false;

  return defaultValue;
}

/**
 * Parses numeric values safely from spreadsheet cells:
 * Handles currency symbols (₹, $, €, INR), commas (1,499), and decimals.
 */
export function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') {
    return isNaN(value) || value <= 0 ? undefined : value;
  }

  // Remove currency symbols (₹, $, €, INR), commas, and spaces
  const cleanStr = String(value)
    .replace(/[₹$€£]|inr/gi, '')
    .replace(/,/g, '')
    .trim();

  if (!cleanStr) return undefined;
  const num = Number(cleanStr);
  return isNaN(num) || num <= 0 ? undefined : num;
}

/**
 * Converts titles into URL-safe slugs
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start
    .replace(/-+$/, ''); // Trim - from end
}

/**
 * Normalizes a raw key-value row from Google Sheets into a clean Product candidate.
 * Fully tolerant of human spreadsheet variations (spaces, capitalization, formulas, blanks).
 */
export function normalizeProductRow(
  raw: Record<string, unknown>,
  rowIndex: number
): { product: Partial<Product>; validation: ValidationResult } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Helper to get case-insensitive row property
  const getField = (key: string): unknown => {
    const targetKey = key.toLowerCase().replace(/[_\s-]/g, '');
    for (const [k, v] of Object.entries(raw)) {
      if (k.toLowerCase().replace(/[_\s-]/g, '') === targetKey) return v;
    }
    return undefined;
  };

  const title = sanitizeText(getField('title') || getField('name') || getField('productname'));
  const rawSlug = sanitizeText(getField('slug'));
  const rawId = sanitizeText(getField('id'));
  const rawImage = getField('image') || getField('imageurl') || getField('photo');
  const rawAffiliateUrl = getField('affiliateurl') || getField('affiliatelink') || getField('link') || getField('url');
  const rawPrice = getField('price');

  // Blank row check: If title, id, price, image, and affiliate link are all empty, it is an empty row
  const isBlank = !title && !rawSlug && !rawId && !rawImage && !rawAffiliateUrl && (rawPrice === undefined || rawPrice === '');
  if (isBlank) {
    return {
      product: {},
      validation: {
        isValid: false,
        isBlank: true,
        errors: ['Blank spreadsheet row'],
        warnings: [],
      },
    };
  }

  // Stable slug generation:
  // If slug is blank, generate stable slug from title (or ID).
  // Never mutate slug if already provided.
  const slug = rawSlug ? slugify(rawSlug) : (title ? slugify(title) : (rawId ? slugify(rawId) : ''));

  // Stable ID:
  const id = rawId || (slug ? `prod-${slug}` : `prod-row-${rowIndex + 1}`);

  // Optional brand & store
  const brand = sanitizeText(getField('brand'));
  const store = sanitizeText(getField('store')) || '';

  // Category mapping (case-insensitive)
  const rawCategory = sanitizeText(getField('category')).toLowerCase();
  const validCategories: ProductCategory[] = ['fashion', 'beauty', 'accessories', 'footwear', 'lifestyle'];
  const category: ProductCategory = validCategories.includes(rawCategory as ProductCategory)
    ? (rawCategory as ProductCategory)
    : 'fashion';

  const subcategory = sanitizeText(getField('subcategory')) || undefined;

  // Media
  const image = sanitizeUrl(rawImage);
  const imageAlt = sanitizeText(getField('imagealt')) || title;

  // Pricing
  const price = parseNumber(rawPrice);
  const originalPrice = parseNumber(getField('originalprice'));
  const defaultCurrency = process.env.DEFAULT_CURRENCY || 'INR';
  const currency = sanitizeText(getField('currency')).toUpperCase() || defaultCurrency;

  // Discount logic (Phase 11 Requirement #6):
  // If explicitly supplied, use it only if valid. If omitted, calculate only when originalPrice > price.
  let discount = sanitizeText(getField('discount')) || undefined;
  if (!discount && price !== undefined && originalPrice !== undefined && originalPrice > price) {
    const calculated = Math.round(((originalPrice - price) / originalPrice) * 100);
    if (calculated > 0) {
      discount = `${calculated}% OFF`;
    }
  }

  // Editorial & Social
  const description = sanitizeText(getField('description')) || title;
  const creatorNote = sanitizeText(getField('creatornote')) || undefined;
  const badge = sanitizeText(getField('badge')) || undefined;
  const ctaText = sanitizeText(getField('ctatext')) || undefined;

  const instagramUrl = sanitizeUrl(getField('instagramurl'));
  const reelUrl = sanitizeUrl(getField('reelurl'));
  const videoUrl = sanitizeUrl(getField('videourl'));

  // Tags
  const rawTags = getField('tags');
  let tags: string[] | undefined = undefined;
  if (rawTags) {
    tags = String(rawTags)
      .split(',')
      .map(t => sanitizeText(t))
      .filter(t => t.length > 0);
  }

  // Affiliate Destination URL
  const affiliateUrl = sanitizeUrl(rawAffiliateUrl);
  const canonicalUrl = sanitizeUrl(getField('canonicalurl'));

  // Status Normalization (Phase 11 Requirement #4):
  // Normalize published, Published, active, Active -> 'active'
  // Normalize draft, Draft -> 'draft'
  // Normalize archived, Archived -> 'archived'
  // Invalid statuses must NOT silently publish; default safely to 'draft'.
  const rawStatus = sanitizeText(getField('status')).toLowerCase();
  let status: ProductStatus = 'draft';
  if (rawStatus === 'published' || rawStatus === 'active') {
    status = 'active';
  } else if (rawStatus === 'archived') {
    status = 'archived';
  } else if (rawStatus === 'draft') {
    status = 'draft';
  } else if (rawStatus.length > 0) {
    warnings.push(`Unrecognized status "${rawStatus}" defaulted to "draft"`);
  }

  // Merchandising flags
  const featured = parseBoolean(getField('featured'), false);
  const trending = parseBoolean(getField('trending'), false);
  const isNew = parseBoolean(getField('new'), false);
  const displayOrder = parseNumber(getField('displayorder')) ?? (rowIndex + 1) * 10;

  // Dates
  const nowIso = new Date().toISOString();
  const publishedAt = sanitizeText(getField('publishedat')) || nowIso;
  const updatedAt = sanitizeText(getField('updatedat')) || nowIso;

  // Phase 11: Scheduled Publishing & Internal Notes (Requirements #13 & #14)
  const internalNote = sanitizeText(getField('internalnote')) || undefined;
  const publishAt = sanitizeText(getField('publishat')) || undefined;
  const unpublishAt = sanitizeText(getField('unpublishat')) || undefined;

  // Creator Content Metadata
  const rawContentId = sanitizeText(getField('contentid') || getField('content'));
  const rawContentIds = getField('contentids');
  let contentIds: string[] | undefined = undefined;

  if (rawContentIds) {
    contentIds = String(rawContentIds)
      .split(',')
      .map(s => sanitizeText(s))
      .filter(s => s.length > 0);
  } else if (rawContentId) {
    contentIds = rawContentId.includes(',')
      ? rawContentId.split(',').map(s => sanitizeText(s)).filter(s => s.length > 0)
      : [rawContentId];
  }

  const contentId = (contentIds && contentIds.length > 0) ? contentIds[0] : (rawContentId || undefined);

  const rawContentType = sanitizeText(getField('contenttype')).toLowerCase();
  const validContentTypes: CreatorContentType[] = ['reel', 'post', 'story', 'video', 'campaign'];
  const contentType: CreatorContentType | undefined = validContentTypes.includes(rawContentType as CreatorContentType)
    ? (rawContentType as CreatorContentType)
    : (contentId ? 'reel' : undefined);

  const contentTitle = sanitizeText(getField('contenttitle')) || undefined;
  const contentUrl = sanitizeUrl(getField('contenturl'));
  const contentThumbnail = sanitizeUrl(getField('contentthumbnail'));

  const campaignId = sanitizeText(getField('campaignid')) || undefined;
  const campaignName = sanitizeText(getField('campaignname')) || undefined;
  const contentOrder = parseNumber(getField('contentorder'));

  const rawContentStatus = sanitizeText(getField('contentstatus')).toLowerCase();
  let contentStatus: 'published' | 'draft' | 'archived' | undefined = undefined;
  if (rawContentStatus === 'published' || rawContentStatus === 'active') {
    contentStatus = 'published';
  } else if (rawContentStatus === 'draft') {
    contentStatus = 'draft';
  } else if (rawContentStatus === 'archived') {
    contentStatus = 'archived';
  } else if (contentId) {
    contentStatus = 'published';
  }

  // Required Field Validation:
  if (!id) errors.push('Missing mandatory field: id');
  if (!title) errors.push('Missing mandatory field: title');
  if (!image) errors.push('Missing or invalid image URL');
  if (price === undefined || price <= 0) errors.push('Missing or invalid numeric price');
  if (!affiliateUrl) errors.push('Missing or invalid affiliateUrl');
  if (!slug) errors.push('Unable to generate valid slug');

  // Optional warnings
  if (!creatorNote) warnings.push('Missing creator note (recommended for editorial trust)');
  const rawSource = sanitizeText(getField('source')).toLowerCase();
  const source = (rawSource === 'google-sheet' || rawSource === 'affiliate-api' || rawSource === 'merchant-feed' || rawSource === 'manual')
    ? (rawSource as 'manual' | 'google-sheet' | 'affiliate-api' | 'merchant-feed')
    : 'manual';

  const normalized: Partial<Product> = {
    id,
    slug,
    title,
    brand,
    store,
    category,
    subcategory,
    tags,
    image,
    imageAlt,
    price,
    originalPrice,
    currency,
    discount,
    description,
    creatorNote,
    badge,
    ctaText,
    affiliateUrl,
    canonicalUrl,
    source,
    status,
    featured,
    trending,
    new: isNew,
    displayOrder,
    publishedAt,
    updatedAt,
    instagramUrl,
    reelUrl,
    videoUrl,
    contentId,
    contentIds,
    contentType,
    contentTitle,
    contentUrl,
    contentThumbnail,
    campaignId,
    campaignName,
    contentOrder,
    contentStatus,
    internalNote,
    publishAt,
    unpublishAt,
  };

  return {
    product: normalized,
    validation: {
      isValid: errors.length === 0,
      isBlank: false,
      errors,
      warnings,
    },
  };
}

/**
 * Audits a single product for health and compliance.
 */
export function auditProductHealth(product: Partial<Product>): ProductHealthReport {
  const issues: ProductHealthIssue[] = [];

  // Required checks (Severity: invalid)
  if (!product.id || product.id.trim().length === 0) {
    issues.push({ field: 'id', severity: 'invalid', message: 'Product ID is missing.' });
  }
  if (!product.title || product.title.trim().length === 0) {
    issues.push({ field: 'title', severity: 'invalid', message: 'Product title is missing.' });
  }
  if (!product.image || (!product.image.startsWith('http://') && !product.image.startsWith('https://') && !product.image.startsWith('/'))) {
    issues.push({ field: 'image', severity: 'invalid', message: 'Missing or malformed image URL (must be valid HTTP/HTTPS).' });
  }
  if (product.price === undefined || product.price <= 0) {
    issues.push({ field: 'price', severity: 'invalid', message: 'Invalid or missing price (must be a positive number).' });
  }
  if (!product.affiliateUrl || (!product.affiliateUrl.startsWith('http://') && !product.affiliateUrl.startsWith('https://'))) {
    issues.push({ field: 'affiliateUrl', severity: 'invalid', message: 'Missing or malformed affiliate destination URL.' });
  }
  if (!product.slug || product.slug.trim().length === 0) {
    issues.push({ field: 'slug', severity: 'invalid', message: 'Product slug is missing or unparseable.' });
  }

  // Recommended checks (Severity: warning)
  if (product.category !== undefined && product.category.trim().length === 0) {
    issues.push({ field: 'category', severity: 'warning', message: 'Product category is missing.' });
  }
  if (product.status && !['active', 'draft', 'archived'].includes(product.status)) {
    issues.push({ field: 'status', severity: 'invalid', message: 'Product status must be active, draft, or archived.' });
  }
  if (product.contentId && !/^[a-zA-Z0-9_-]+$/.test(product.contentId)) {
    issues.push({ field: 'contentId', severity: 'warning', message: `Invalid content reference "${product.contentId}". Must contain only alphanumeric, dash, or underscore.` });
  }
  if (product.campaignId && !/^[a-zA-Z0-9_-]+$/.test(product.campaignId)) {
    issues.push({ field: 'campaignId', severity: 'warning', message: `Invalid campaign reference "${product.campaignId}". Must contain only alphanumeric, dash, or underscore.` });
  }
  if (!product.creatorNote) {
    issues.push({ field: 'creatorNote', severity: 'warning', message: 'Creator note is missing (strongly recommended for conversions).' });
  }
  if (!product.brand) {
    issues.push({ field: 'brand', severity: 'warning', message: 'Brand name is omitted.' });
  }
  if (product.originalPrice && product.price && product.originalPrice <= product.price) {
    issues.push({ field: 'originalPrice', severity: 'warning', message: 'Original price is less than or equal to current price.' });
  }
  if (product.publishAt && isNaN(new Date(product.publishAt).getTime())) {
    issues.push({ field: 'publishAt', severity: 'warning', message: 'publishAt timestamp is not a valid ISO date.' });
  }
  if (product.unpublishAt && isNaN(new Date(product.unpublishAt).getTime())) {
    issues.push({ field: 'unpublishAt', severity: 'warning', message: 'unpublishAt timestamp is not a valid ISO date.' });
  }

  const hasInvalid = issues.some(i => i.severity === 'invalid');
  const hasWarning = issues.some(i => i.severity === 'warning');
  const grade: ProductHealthGrade = hasInvalid ? 'invalid' : (hasWarning ? 'warning' : 'healthy');

  return {
    product: product as Product,
    grade,
    issues,
  };
}

/**
 * Deduplicates and guarantees unique IDs and unique slugs across the entire dataset.
 * Resolves collisions deterministically while logging structured warnings.
 */
export function deduplicateAndSanitizeProducts(rawRows: Record<string, unknown>[]): Product[] {
  const seenIds = new Set<string>();
  const seenSlugs = new Map<string, number>();
  const validProducts: Product[] = [];

  rawRows.forEach((row, index) => {
    const { product, validation } = normalizeProductRow(row, index);

    // Gracefully skip empty rows
    if (validation.isBlank) {
      return;
    }

    if (!validation.isValid) {
      // eslint-disable-next-line no-console
      console.warn(`[GoogleSheets Warning] Skipping invalid product at row ${index + 2}:`, {
        errors: validation.errors,
        id: product.id || 'unknown',
        title: product.title || 'untitled',
      });
      return;
    }

    const typedProduct = product as Product;

    // Duplicate ID protection: Deduplicate rows by ID, keeping only first entry
    if (seenIds.has(typedProduct.id)) {
      // eslint-disable-next-line no-console
      console.warn(`[GoogleSheets Warning] Duplicate product ID "${typedProduct.id}" at row ${index + 2}. Skipping duplicate row.`);
      return;
    }
    seenIds.add(typedProduct.id);

    // Unique slug guarantee with deterministic collision resolution
    let finalSlug = typedProduct.slug;
    if (seenSlugs.has(finalSlug)) {
      const count = seenSlugs.get(finalSlug)! + 1;
      seenSlugs.set(finalSlug, count);
      finalSlug = `${finalSlug}-${count}`;
      typedProduct.slug = finalSlug;
    } else {
      seenSlugs.set(finalSlug, 1);
    }

    validProducts.push(typedProduct);
  });

  return validProducts;
}

/**
 * Generates a full catalog health summary and list of individual reports
 */
export function auditCatalogHealth(products: Product[]): {
  summary: CatalogHealthSummary;
  reports: ProductHealthReport[];
} {
  let healthy = 0;
  let warnings = 0;
  let invalid = 0;
  let published = 0;
  let draft = 0;
  let archived = 0;

  const issuesCount: Record<string, number> = {};

  // Track ID and slug occurrences for duplicate detection
  const idCounts = new Map<string, number>();
  const slugCounts = new Map<string, number>();
  for (const p of products) {
    if (p.id) idCounts.set(p.id, (idCounts.get(p.id) || 0) + 1);
    if (p.slug) slugCounts.set(p.slug, (slugCounts.get(p.slug) || 0) + 1);
  }

  const reports: ProductHealthReport[] = products.map((p) => {
    const report = auditProductHealth(p);

    if (p.id && (idCounts.get(p.id) || 0) > 1) {
      report.issues.push({
        field: 'id',
        severity: 'invalid',
        message: `Duplicate product ID "${p.id}" detected in catalog.`,
      });
    }

    if (p.slug && (slugCounts.get(p.slug) || 0) > 1) {
      report.issues.push({
        field: 'slug',
        severity: 'invalid',
        message: `Duplicate URL slug "${p.slug}" detected in catalog.`,
      });
    }

    // Recalculate grade if new issues were added
    const hasInvalid = report.issues.some(i => i.severity === 'invalid');
    const hasWarning = report.issues.some(i => i.severity === 'warning');
    report.grade = hasInvalid ? 'invalid' : (hasWarning ? 'warning' : 'healthy');

    if (report.grade === 'healthy') healthy++;
    else if (report.grade === 'warning') warnings++;
    else if (report.grade === 'invalid') invalid++;

    if (p.status === 'active') published++;
    else if (p.status === 'draft') draft++;
    else if (p.status === 'archived') archived++;

    report.issues.forEach((iss) => {
      issuesCount[iss.field] = (issuesCount[iss.field] || 0) + 1;
    });

    return report;
  });

  return {
    summary: {
      total: products.length,
      published,
      draft,
      archived,
      healthy,
      warnings,
      invalid,
      issuesCount,
    },
    reports,
  };
}
