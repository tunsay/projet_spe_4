import type { NextConfig } from "next";
import dotenvLoad from "dotenv-load";

dotenvLoad();

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_API_URL: process.env.NEXT_API_URL,
  }
};

export default nextConfig;
