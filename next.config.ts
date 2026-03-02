import type { NextConfig } from "next";

const normalizeBasePath = (value?: string) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

const nextConfig: NextConfig = {
  // Only use standalone output for production builds
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  // Temporarily disable react compiler to debug dev server issues
  // reactCompiler: true,
  // Note: Don't use env block here as it overrides .env.local values at build time
  // Environment variables are loaded automatically from .env.local at runtime
};

export default nextConfig;
