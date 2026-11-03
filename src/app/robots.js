export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/profile', '/bookings', '/api/'],
    },
    sitemap: 'https://workout-website-pi.vercel.app/sitemap.xml',
  };
}
