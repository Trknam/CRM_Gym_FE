"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.env = {
    port: Number(process.env.PORT ?? 4000),
    databaseUrl: process.env.DATABASE_URL ?? "",
    valkeyUrl: process.env.VALKEY_URL ?? "redis://valkey:6379",
    nodeEnv: process.env.NODE_ENV ?? "development",
};
