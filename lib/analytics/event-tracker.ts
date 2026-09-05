import fs from 'fs';
import path from 'path';
import { AnalyticsEvent, StandardAnalyticsEventName } from '@/types/analytics';

const DATA_DIR = path.join(process.cwd(), '.analytics');
const LOG_FILE = path.join(DATA_DIR, 'events.json');

export class EventTracker {
  private static events: AnalyticsEvent[] = [];
  private static isInitialized = false;
  private static recentEventCache = new Map<string, number>(); // deduplication cache

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
      console.warn('[EventTracker] Could not load stored events, starting fresh in-memory:', err);
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
      console.error('[EventTracker] Error persisting event to disk:', err);
    }
  }

  /**
   * Records an analytics event asynchronously and deduplicates rapid consecutive identical events.
   */
  public static recordEvent(event: AnalyticsEvent): boolean {
    this.ensureInitialized();

    const now = Date.now();
    const dedupKey = `${event.sessionId || 'anon'}_${event.eventType}_${event.productId || event.contentId || event.campaignId || event.source || ''}`;
    const lastTime = this.recentEventCache.get(dedupKey) || 0;

    // Deduplicate identical event from same session within 1000ms
    if (now - lastTime < 1000) {
      this.recentEventCache.set(dedupKey, now);
      return false;
    }

    this.recentEventCache.set(dedupKey, now);

    // Clean up deduplication cache
    if (this.recentEventCache.size > 1000) {
      this.recentEventCache.forEach((time, k) => {
        if (now - time > 60000) this.recentEventCache.delete(k);
      });
    }

    this.events.push(event);

    // Async disk persistence
    setImmediate(() => {
      this.persistToFile();
    });

    return true;
  }

  public static getEvents(filter?: {
    eventType?: StandardAnalyticsEventName;
    productId?: string;
    contentId?: string;
    campaignId?: string;
    since?: Date;
  }): AnalyticsEvent[] {
    this.ensureInitialized();
    let list = [...this.events];

    if (filter?.eventType) {
      list = list.filter(e => e.eventType === filter.eventType);
    }
    if (filter?.productId) {
      list = list.filter(e => e.productId === filter.productId || e.productSlug === filter.productId);
    }
    if (filter?.contentId) {
      list = list.filter(e => e.contentId === filter.contentId);
    }
    if (filter?.campaignId) {
      list = list.filter(e => e.campaignId === filter.campaignId);
    }
    if (filter?.since) {
      const sinceMs = filter.since.getTime();
      list = list.filter(e => new Date(e.timestamp).getTime() >= sinceMs);
    }

    return list;
  }

  public static getAllEvents(): AnalyticsEvent[] {
    this.ensureInitialized();
    return [...this.events];
  }

  public static clear(): void {
    this.events = [];
    this.recentEventCache.clear();
    this.persistToFile();
  }
}
