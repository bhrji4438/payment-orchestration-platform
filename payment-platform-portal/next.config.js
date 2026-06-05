const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias['zod'] = path.resolve(__dirname, 'node_modules/zod');
    return config;
  }
};

module.exports = nextConfig;
