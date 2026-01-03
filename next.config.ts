import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	reactStrictMode: false,
	output: 'standalone',  // Docker 部署优化
};

export default nextConfig;
