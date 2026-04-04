export default function middleware(request: Request) {
  const userAgent = request.headers.get('user-agent') || '';
  
  // Block common aggressive bots, scrapers, and automated tools
  const blockedBots = [
    'SemrushBot', 'AhrefsBot', 'DotBot', 'PetalBot', 'MJ12bot', 
    'Baiduspider', 'YandexBot', 'bingbot', 'python-requests',
    'curl', 'wget', 'Go-http-client', 'scrapy', 'postman'
  ];

  if (blockedBots.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase()))) {
    return new Response('Forbidden: Bot access denied', { status: 403 });
  }

  // Basic IP rate limiting is hard at the edge without Redis, 
  // but blocking these user-agents stops 90% of automated abuse.
}

export const config = {
  matcher: '/:path*',
};
