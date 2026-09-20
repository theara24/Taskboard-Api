import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 TaskBoard API server running on port ${env.PORT} in [${env.NODE_ENV}] mode`);
  console.log(`📚 Swagger Documentation available at: http://localhost:${env.PORT}/api-docs`);
});

// Graceful Shutdown Handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Database connections disconnected.');
    process.exit(0);
  });

  // Force close after 10s timeout
  setTimeout(() => {
    console.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
