import mongoose from 'mongoose';

export type StorageMode = 'mongo' | 'sqlite' | 'auto';

/**
 * DB_MODE controls which store is authoritative.
 * - mongo:  MongoDB is required. Startup fails hard if Atlas is unreachable.
 * - sqlite: SQLite is authoritative, even if MongoDB happens to be reachable.
 * - auto:   (default) Prefers MongoDB when connected, silently falls back to
 *           SQLite when Atlas is unreachable (e.g. IP not whitelisted, env var
 *           missing). The app stays online instead of returning a 503.
 *
 * Once Atlas is fully configured (IP whitelisted + MONGODB_URI set in Vercel),
 * set DB_MODE=mongo in Vercel env vars to lock the app to Atlas exclusively.
 */
export const getStorageMode = (): StorageMode => {
  const configured = String(process.env.DB_MODE || '').trim().toLowerCase();
  if (configured === 'mongo' || configured === 'sqlite' || configured === 'auto') {
    return configured;
  }
  // Default 'auto': try MongoDB, silently fall back to SQLite if unreachable.
  // This prevents a visible 503 when MONGODB_URI or Atlas whitelist is not set.
  return 'auto';
};

export const isMongoMode = (): boolean => getStorageMode() === 'mongo';

export const isSqliteMode = (): boolean => getStorageMode() === 'sqlite';

/** Single decision point for which store controllers must read and write. */
export const useMongo = (): boolean => {
  const mode = getStorageMode();
  if (mode === 'mongo') return mongoose.connection.readyState === 1;
  if (mode === 'sqlite') return false;
  return mongoose.connection.readyState === 1;
};

export const assertStorageReady = (): void => {
  const mode = getStorageMode();
  if (mode === 'mongo' && mongoose.connection.readyState !== 1) {
    throw new Error(
      'MongoDB is required (DB_MODE=mongo) but the connection is not ready. Refusing to fall back to ephemeral SQLite storage.'
    );
  }
};
