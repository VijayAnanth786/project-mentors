/**
 * Minimal real server used by lifecycle.test.ts to prove persistence across a
 * fresh OS process. It shares the exact same SQLITE_PATH through inherited env.
 */
import app, { ensureDB } from '../src/app';

const start = async (): Promise<void> => {
  await ensureDB();

  const server = app.listen(0, '127.0.0.1', () => {
    const address = server.address();
    if (address && typeof address === 'object') {
      process.stdout.write(`RESTART_SERVER_PORT=${address.port}\n`);
    } else {
      console.error('Restart server did not receive a TCP address.');
      process.exit(1);
    }
  });

  server.on('error', (error) => {
    console.error('Restart server failed:', error);
    process.exit(1);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
    // Do not let keep-alive sockets delay shutdown.
    server.closeAllConnections?.();
    setTimeout(() => process.exit(0), 2000).unref();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

start().catch((error) => {
  console.error('Restart server startup failure:', error);
  process.exit(1);
});
