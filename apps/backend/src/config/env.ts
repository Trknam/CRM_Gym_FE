export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  valkeyUrl: process.env.VALKEY_URL ?? "redis://valkey:6379",
  nodeEnv: process.env.NODE_ENV ?? "development",
};