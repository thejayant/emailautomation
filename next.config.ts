import type { NextConfig } from "next";
import path from "node:path";

const isDesktopBuild = process.env.BUILD_TARGET === "desktop";

const nextConfig: NextConfig = {
  output: isDesktopBuild ? "standalone" : undefined,
  reactCompiler: true,
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
