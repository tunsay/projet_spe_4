/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            // /api/... côté navigateur -> proxy interne vers service Docker "api"
            {
                source: "/api/:path*",
                destination: "http://api:3000/api/:path*",
            },
        ];
    },
};
module.exports = nextConfig;
