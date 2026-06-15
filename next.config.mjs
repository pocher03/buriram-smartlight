/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone build สำหรับ Docker (ลดขนาด image, ไม่ต้อง copy node_modules ทั้งก้อน)
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
