import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

// In-memory counters — reset on restart (acceptable for a simple setup)
const counters = {
  requestsTotal: 0,
  errorsTotal: 0,
};

// Histogram buckets for response latency (in seconds)
const BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const latencyHistogram: Record<string, number> = {};
let latencySum = 0;
let latencyCount = 0;

// Initialize buckets
for (const b of BUCKETS) {
  latencyHistogram[String(b)] = 0;
}

/**
 * Middleware to collect request metrics.
 * Mount this BEFORE routes in the middleware chain.
 */
export function collectMetrics(req: Request, res: Response, next: NextFunction): void {
  counters.requestsTotal++;
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationSec = durationNs / 1e9;

    latencySum += durationSec;
    latencyCount++;

    // Increment histogram buckets
    for (const b of BUCKETS) {
      if (durationSec <= b) {
        latencyHistogram[String(b)]++;
      }
    }

    if (res.statusCode >= 400) {
      counters.errorsTotal++;
    }
  });

  next();
}

/**
 * GET /api/metrics
 * Prometheus-compatible text exposition format.
 */
router.get('/metrics', (_req: Request, res: Response) => {
  const lines: string[] = [];

  // Request counter
  lines.push('# HELP http_requests_total Total HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  lines.push(`http_requests_total ${counters.requestsTotal}`);

  // Error counter
  lines.push('# HELP http_errors_total Total HTTP errors (4xx + 5xx)');
  lines.push('# TYPE http_errors_total counter');
  lines.push(`http_errors_total ${counters.errorsTotal}`);

  // Latency histogram
  lines.push('# HELP http_request_duration_seconds HTTP request latency');
  lines.push('# TYPE http_request_duration_seconds histogram');
  let cumulative = 0;
  for (const b of BUCKETS) {
    cumulative += latencyHistogram[String(b)];
    lines.push(`http_request_duration_seconds_bucket{le="${b}"} ${cumulative}`);
  }
  lines.push(`http_request_duration_seconds_bucket{le="+Inf"} ${latencyCount}`);
  lines.push(`http_request_duration_seconds_sum ${latencySum.toFixed(6)}`);
  lines.push(`http_request_duration_seconds_count ${latencyCount}`);

  // Memory gauge
  const mem = process.memoryUsage();
  lines.push('# HELP process_heap_bytes Process heap memory in bytes');
  lines.push('# TYPE process_heap_bytes gauge');
  lines.push(`process_heap_bytes ${mem.heapUsed}`);

  lines.push('# HELP process_rss_bytes Process RSS in bytes');
  lines.push('# TYPE process_rss_bytes gauge');
  lines.push(`process_rss_bytes ${mem.rss}`);

  // Uptime gauge
  lines.push('# HELP process_uptime_seconds Process uptime in seconds');
  lines.push('# TYPE process_uptime_seconds gauge');
  lines.push(`process_uptime_seconds ${Math.round(process.uptime())}`);

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(lines.join('\n') + '\n');
});

export { router as metricsRouter };
