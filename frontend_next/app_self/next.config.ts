import type { NextConfig } from "next";

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// module.exports = {
//   env: {
//     NEXT_PUBLIC_API_PORT: process.env.API_PORT,
//     NEXT_PUBLIC_API_BASE_URL: process.env.API_BASE_URL,
//     NEXT_PUBLIC_USE_SSL: process.env.USE_SSL,
//     basePath: '/fsque',
//   }
// }

const nextConfig: NextConfig = {


  // async rewrites() {
  //   return [
  //     {
  //       source: '/fsque/:path*',
  //       destination: '/:path*',
  //     },
  //   ]
  // },

  /* config options here */
  basePath: '/fsque',
  trailingSlash: true,
  reactCompiler: true,
  allowedDevOrigins: [
    'http://localhost:9000',
    'http://localhost:9000',
    'https://woodruf-webkit.webhop.me',
    'https://zst-href.rest'
  ],

  env: {
    NEXT_PUBLIC_API_PORT: process.env.API_PORT,
    NEXT_PUBLIC_API_BASE_URL: process.env.API_BASE_URL,
    NEXT_PUBLIC_USE_SSL: process.env.USE_SSL,
  },

  compiler: process.env.NODE_ENV === "production"
  ? {
      removeConsole: {
        exclude: ["error", "warn"], 
      },
    }
: undefined,

};

export default nextConfig;
