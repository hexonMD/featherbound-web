/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // @napi-rs/canvas ships a native .node binary — don't let webpack try to bundle it.
  serverExternalPackages: ["@napi-rs/canvas"],
};
export default nextConfig;
