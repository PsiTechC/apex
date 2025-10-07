// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   reactStrictMode: true,
//   experimental: {
//     serverActions: {}, 
//   },
//   serverExternalPackages: [], 
// };

// module.exports = nextConfig;

const path = require("path");

module.exports = {
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*", // optional
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias["uploads"] = path.join(__dirname, "uploads");
    return config;
  },
};
