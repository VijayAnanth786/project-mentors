import mongoose from 'mongoose';

export type StorageMode = 'mongo' | 'sqlite' | 'auto';

/**
 * DB_MODE controls which store is authoritative.
 * - mongo:  MongoDB is required. Startup fails if it is unavailable.
 * - sqlite: SQLite is authoritative, even if MongoDB happens to be reachable.
 * - auto:   Development convenience only. Prefers MongoDB when connected.
 *
 * Production defaults to mongo so a serverless instance can never silently
 * accept writes into an ephemeral SQLite file.
 */
export const getStorageMode = (): StorageMode => {
  const configured = String(process.env.DB_MODE || '').trim().toLowerCase();
  if (configured === 'mongo' || configured === 'sqlite' || configured === 'auto') {
    return configured;
  }
  return process.env.NODE_ENV === 'production' ? 'mongo' : 'auto';
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
