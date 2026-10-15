import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Tesseract and canvas compatibility
  serverExternalPackages: ["tesseract.js"],
};

export default nextConfig;
