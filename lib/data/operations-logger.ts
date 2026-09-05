import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { OperationLogEntry } from '@/types/product';

const DATA_DIR = path.join(process.cwd(), '.analytics');
const LOG_FILE = path.join(DATA_DIR, 'operations.json');

export class OperationsLogger {
  private static logs: OperationLogEntry[] = [];
  private static isInitialized = false;

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
          this.logs = JSON.parse(raw);
        }
      }
    } catch {
      this.logs = [];
    }
  }

  private static persistToFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(LOG_FILE, JSON.stringify(this.logs, null, 2), 'utf-8');
    } catch {
      // Ignore persistence errors
    }
  }

  public static log(
    action: OperationLogEntry['action'],
    status: OperationLogEntry['status'],
    details: string,
    adminIdentity?: string
  ): OperationLogEntry {
    this.ensureInitialized();

    const entry: OperationLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      status,
      details,
      adminIdentity,
    };

    this.logs.unshift(entry);

    // Keep last 100 entries
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(0, 100);
    }

    setImmediate(() => {
      this.persistToFile();
    });

    return entry;
  }

  public static getRecentLogs(limit = 20): OperationLogEntry[] {
    this.ensureInitialized();
    return this.logs.slice(0, limit);
  }

  public static getLastSyncTime(): string | undefined {
    this.ensureInitialized();
    const sync = this.logs.find(l => l.action === 'sheet_sync' && l.status === 'success');
    return sync?.timestamp;
  }

  public static getLastRefreshTime(): string | undefined {
    this.ensureInitialized();
    const refresh = this.logs.find(l => (l.action === 'admin_refresh' || l.action === 'cache_refresh') && l.status === 'success');
    return refresh?.timestamp;
  }

  public static clear(): void {
    this.logs = [];
    this.persistToFile();
  }
}
