import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.imgflip.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
