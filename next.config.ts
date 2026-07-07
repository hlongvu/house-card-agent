import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mlightcad/libredwg-web", "dxf-parser", "pdf-parse"],
};

export default nextConfig;
