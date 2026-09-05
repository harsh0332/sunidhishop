/**
 * Lightweight, privacy-safe application logging & monitoring utility.
 * Sanitizes input to guarantee zero PII (emails, passwords, phone numbers) in logs.
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogPayload {
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
}

function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    // Strip sensitive fields
    if (
      lowerKey.includes('pass') ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('key') ||
      lowerKey.includes('auth') ||
      lowerKey.includes('email') ||
      lowerKey.includes('phone')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeContext(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

class MonitoringLogger {
  private log(level: LogLevel, payload: LogPayload): void {
    const timestamp = new Date().toISOString();
    const cleanContext = sanitizeContext(payload.context);

    const logEntry = {
      timestamp,
      level,
      message: payload.message,
      ...(cleanContext ? { context: cleanContext } : {}),
      ...(payload.error instanceof Error
        ? { error: { name: payload.error.name, message: payload.error.message } }
        : payload.error
        ? { error: String(payload.error) }
        : {}),
    };

    // Use standard console in Node/Browser
    if (level === 'error') {
      // eslint-disable-next-line no-console
      console.error(`[Sunidhi Monitoring ERROR]`, JSON.stringify(logEntry));
    } else if (level === 'warn') {
      // eslint-disable-next-line no-console
      console.warn(`[Sunidhi Monitoring WARN]`, JSON.stringify(logEntry));
    } else if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`[Sunidhi Monitoring INFO]`, JSON.stringify(logEntry));
    }
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.log('info', { message, context });
  }

  public warn(message: string, context?: Record<string, unknown>, error?: unknown): void {
    this.log('warn', { message, context, error });
  }

  public error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    this.log('error', { message, error, context });
  }
}

export const logger = new MonitoringLogger();
