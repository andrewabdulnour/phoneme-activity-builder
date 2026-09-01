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
