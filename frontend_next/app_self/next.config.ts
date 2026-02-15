import type { NextConfig } from "next";

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

module.exports = {
  env: {
    NEXT_PUBLIC_API_PORT: process.env.API_PORT,
    NEXT_PUBLIC_API_BASE_URL: process.env.API_BASE_URL,
    NEXT_PUBLIC_USE_SSL: process.env.USE_SSL,
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
