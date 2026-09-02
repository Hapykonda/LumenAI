import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 640, 768, 1024, 1280, 1536],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31_536_000,
  },
  async redirects() {
    return [
      { source: "/panel/growth", destination: "/panel/lumen-eye?view=growth", permanent: false },
      { source: "/panel/campaigns", destination: "/panel/autoconfig?view=campaigns", permanent: false },
      { source: "/panel/leads", destination: "/panel/chat?view=leads", permanent: false },
      { source: "/panel/twin", destination: "/panel/calibration?view=simulation", permanent: false },
      { source: "/panel/lumenite", destination: "/panel/radar?view=actions", permanent: false },
      { source: "/panel/approvals", destination: "/panel/overview?view=decisions", permanent: false },
      { source: "/panel/permissions", destination: "/panel/access?view=permissions", permanent: false },
      { source: "/panel/integrations", destination: "/panel/interface?view=connections", permanent: false },
      { source: "/panel/settings", destination: "/panel/access", permanent: false },
      { source: "/panel/color-mix", destination: "/panel/interface", permanent: false },
      { source: "/panel/system-health", destination: "/panel/access?view=security", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:folder(backgrounds|brand|gems)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/widget.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
