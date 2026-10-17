/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  outputFileTracingIncludes: {
    '/api/ml/report': ['./ml-service/reports/ml_report.json'],
    '/api/ml/clinical-report': ['./ml-service/reports/clinical_report.json'],
    '/api/ml/clinical-dataset': ['./ml-service/data/dataset.csv'],
    '/api/ml/symcat-dataset': ['./ml-service/artifacts/clinical/symcat_knowledge_base.json'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  async redirects() {
    return [
      { source: '/login', destination: '/auth/login', permanent: true },
      { source: '/signup', destination: '/auth/signup', permanent: true },
    ];
  },
}

module.exports = nextConfig
