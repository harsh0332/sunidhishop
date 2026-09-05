import fs from 'fs';
import path from 'path';
import { ClickEvent, DailyClickMetrics, MerchantClickMetrics, ProductClickMetrics } from '@/types/analytics';

const DATA_DIR = path.join(process.cwd(), '.analytics');
const LOG_FILE = path.join(DATA_DIR, 'clicks.json');

export class ClickTracker {
  private static events: ClickEvent[] = [];
  private static isInitialized = false;
  private static recentClickCache = new Map<string, number>(); // deduplication cache: key -> timestamp

  private static ensureInitialized() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(LOG_FILE)) {
        const raw = fs.readFileSync(LOG_FILE, 'utf-8');
        if (raw.trim()) {
          this.events = JSON.parse(raw);
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[ClickTracker] Could not load stored clicks, starting fresh in-memory:', err);
    }
  }

  private static persistToFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(LOG_FILE, JSON.stringify(this.events, null, 2), 'utf-8');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ClickTracker] Error persisting click event to disk:', err);
    }
  }

  /**
   * Records a click event asynchronously and deduplicates rapid consecutive clicks.
   */
  public static recordClick(event: ClickEvent): boolean {
    this.ensureInitialized();

    const now = Date.now();
    const dedupKey = `${event.sessionId || 'anon'}_${event.productId}`;
    const lastClickTime = this.recentClickCache.get(dedupKey) || 0;

    // Deduplicate if click from same session on same product occurred within 2000ms (prefetch / double-click)
    if (now - lastClickTime < 2000) {
      // Still update deduplication timer, but do not record duplicate event
      this.recentClickCache.set(dedupKey, now);
      return false;
    }

    this.recentClickCache.set(dedupKey, now);

    // Clean up old deduplication cache entries older than 60s
    if (this.recentClickCache.size > 500) {
      this.recentClickCache.forEach((time, k) => {
        if (now - time > 60000) this.recentClickCache.delete(k);
      });
    }

    this.events.push(event);

    // Async disk persistence so redirect is never delayed
    setImmediate(() => {
      this.persistToFile();
    });

    return true;
  }

  public static getRecentClicks(limit = 100, filter?: { productId?: string; merchant?: string; trafficType?: string }): ClickEvent[] {
    this.ensureInitialized();
    let list = [...this.events];

    if (filter?.productId) {
      list = list.filter(e => e.productId === filter.productId || e.productSlug === filter.productId);
    }
    if (filter?.merchant) {
      list = list.filter(e => e.merchant.toLowerCase() === filter.merchant?.toLowerCase());
    }
    if (filter?.trafficType) {
      list = list.filter(e => e.trafficType === filter.trafficType);
    }

    return list.slice(-limit).reverse();
  }

  public static getProductMetrics(): ProductClickMetrics[] {
    this.ensureInitialized();
    const map = new Map<string, ProductClickMetrics>();

    for (const e of this.events) {
      const existing = map.get(e.productId);
      const isHuman = e.trafficType === 'human';
      const isBot = e.trafficType === 'bot';

      if (existing) {
        existing.totalClicks++;
        if (isHuman) existing.humanClicks++;
        if (isBot) existing.botClicks++;
        if (new Date(e.timestamp) > new Date(existing.lastClickedAt)) {
          existing.lastClickedAt = e.timestamp;
        }
      } else {
        map.set(e.productId, {
          productId: e.productId,
          productSlug: e.productSlug,
          merchant: e.merchant,
          totalClicks: 1,
          humanClicks: isHuman ? 1 : 0,
          botClicks: isBot ? 1 : 0,
          lastClickedAt: e.timestamp,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalClicks - a.totalClicks);
  }

  public static getMerchantMetrics(): MerchantClickMetrics[] {
    this.ensureInitialized();
    const map = new Map<string, { total: number; human: number; sessions: Set<string>; last: string }>();

    for (const e of this.events) {
      const entry = map.get(e.merchant) || {
        total: 0,
        human: 0,
        sessions: new Set<string>(),
        last: e.timestamp,
      };

      entry.total++;
      if (e.trafficType === 'human') entry.human++;
      if (e.sessionId) entry.sessions.add(e.sessionId);
      if (new Date(e.timestamp) > new Date(entry.last)) entry.last = e.timestamp;

      map.set(e.merchant, entry);
    }

    return Array.from(map.entries()).map(([merchant, data]) => ({
      merchant,
      totalClicks: data.total,
      humanClicks: data.human,
      uniqueSessions: data.sessions.size,
      lastClickedAt: data.last,
    })).sort((a, b) => b.totalClicks - a.totalClicks);
  }

  public static getDailyMetrics(): DailyClickMetrics[] {
    this.ensureInitialized();
    const map = new Map<string, DailyClickMetrics>();

    for (const e of this.events) {
      const date = e.timestamp.slice(0, 10); // YYYY-MM-DD
      const key = `${date}_${e.productId}_${e.merchant}`;
      const isHuman = e.trafficType === 'human';
      const isBot = e.trafficType === 'bot';

      const existing = map.get(key);
      if (existing) {
        existing.clicks++;
        if (isHuman) existing.humanClicks++;
        if (isBot) existing.botClicks++;
      } else {
        map.set(key, {
          date,
          productId: e.productId,
          merchant: e.merchant,
          clicks: 1,
          humanClicks: isHuman ? 1 : 0,
          botClicks: isBot ? 1 : 0,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }

  public static clear(): void {
    this.events = [];
    this.recentClickCache.clear();
    this.persistToFile();
  }
}
