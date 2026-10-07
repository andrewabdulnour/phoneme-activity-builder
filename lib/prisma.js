import { PrismaClient } from "@prisma/client";

// A single PrismaClient instance is reused across hot reloads in
// development (Next.js re-evaluates modules on every change, which would
// otherwise open a new connection pool each time and exhaust the
// database) and shared for the lifetime of the server in production.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// SQLite in write-ahead-log mode lets readers keep reading while the
// observability tables are being written — important under load, where
// every generation and page view is also an INSERT. The setting is stored
// in the database file, so running it once per process is enough.
if (!globalForPrisma.prismaWalEnabled) {
  globalForPrisma.prismaWalEnabled = true;
  prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;").catch((err) => {
    console.warn("[prisma] could not enable WAL mode:", err.message);
  });
}
