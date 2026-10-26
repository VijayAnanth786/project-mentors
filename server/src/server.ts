import app, { ensureDB } from './app';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await ensureDB();

    app.listen(PORT, () => {
      console.log(`🚀 [ProjectMentor Server] Running on http://localhost:${PORT}`);
    });
  } catch (error: any) {
    console.error(`[Server Startup Failure] ${error?.message || error}`);
    process.exit(1);
  }
};

startServer();
