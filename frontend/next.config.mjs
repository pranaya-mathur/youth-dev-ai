/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  /**
   * Browser calls `/api-proxy/*` (same origin). `app/api-proxy/[...path]/route.ts` forwards to
   * `BACKEND_URL` (default `http://127.0.0.1:8000`). Set `BACKEND_URL` on Cloud Run at runtime — no
   * rebuild when the API URL changes. Use `NEXT_PUBLIC_API_PROXY=false` + `NEXT_PUBLIC_API_URL` to
   * call the API directly from the browser (requires CORS on the API).
   */
};

export default nextConfig;
