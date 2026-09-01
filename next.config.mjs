/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prisma ships a native query engine; keep it external so Next doesn't
  // try to bundle the binary into the server build.
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
