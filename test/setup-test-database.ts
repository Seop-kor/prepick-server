const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL is required for database tests; refusing to use DATABASE_URL',
  );
}

process.env.DATABASE_URL = testDatabaseUrl;
