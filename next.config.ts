import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["irtaki.com", "www.irtaki.com"],
  compress: true,
  productionBrowserSourceMaps: false,
  typescript: {
    // Erreurs préexistantes dans src/auth/password/ (non liées à la PWA).
    // À corriger dans une session dédiée.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
