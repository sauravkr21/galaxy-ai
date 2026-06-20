/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Transloadit / S3 result hosts and Google user content
      { protocol: "https", hostname: "**.transloadit.com" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**" },
    ],
  },
  // Trigger.dev SDK + prisma are server-only; keep them out of the client bundle.
  serverExternalPackages: ["@trigger.dev/sdk", "@prisma/client"],
};

export default nextConfig;
