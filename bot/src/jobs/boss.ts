/**
 * pg-boss Job Queue Manager
 * Singleton instance backed by PostgreSQL — no Redis needed.
 */

import { PgBoss } from 'pg-boss';

let boss: PgBoss | null = null;

export async function startJobQueue(): Promise<PgBoss> {
  if (boss) return boss;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not set — cannot start job queue');
  }

  boss = new PgBoss(databaseUrl);

  boss.on('error', ((error: Error) => {
    console.error('[PG-BOSS] Error:', error);
  }) as any);

  await boss.start();
  console.log('[PG-BOSS] Job queue started');
  return boss;
}

export function getJobQueue(): PgBoss | null {
  return boss;
}

export async function stopJobQueue(): Promise<void> {
  if (boss) {
    await boss.stop();
    boss = null;
    console.log('[PG-BOSS] Job queue stopped');
  }
}
