/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  /**
   * In `next dev`, browser calls go to `/api-proxy/*` (same origin) so chat/API work on a phone or
   * `http://192.168.x.x:3000` without putting a LAN IP in NEXT_PUBLIC_API_URL.
   */
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    const target = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
    return [{ source: "/api-proxy/:path*", destination: `${target}/:path*` }];
  },
};

export default nextConfig;
