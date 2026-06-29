import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.mongo.uri);
    logger.info(`[db] MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    logger.error('[db] MongoDB connection failed:', err);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    logger.warn('[db] MongoDB disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    logger.info('[db] MongoDB reconnected');
  });
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  logger.info('[db] MongoDB disconnected (graceful shutdown)');
}
