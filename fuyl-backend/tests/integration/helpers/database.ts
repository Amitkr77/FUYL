import mongoose from 'mongoose';

export const TEST_MONGODB_URI =
  process.env.TEST_MONGODB_URI
  ?? 'mongodb://127.0.0.1:27018/fuyl_test?replicaSet=rs0&directConnection=true';

export async function connectTestDatabase() {
  const databaseName = new URL(TEST_MONGODB_URI).pathname.replace(/^\//, '');
  if (databaseName !== 'fuyl_test') {
    throw new Error(`Refusing to run destructive integration tests against database "${databaseName}"`);
  }
  await mongoose.connect(TEST_MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  if (mongoose.connection.db?.databaseName !== 'fuyl_test') {
    throw new Error('Integration test database safety check failed');
  }
}

export async function resetTestDatabase() {
  if (mongoose.connection.db?.databaseName !== 'fuyl_test') {
    throw new Error('Refusing to clear a non-test database');
  }
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export async function disconnectTestDatabase() {
  await mongoose.disconnect();
}
