import { NextResponse } from 'next/server';

function clean(value, fallback = '') {
  const v = (value || '').toString().trim();
  return v || fallback;
}

function getIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return clean(request.headers.get('x-real-ip'), '未知IP');
}

export async function GET(request) {
  const h = request.headers;

  // Vercel normally provides these headers on deployed requests.
  const city = decodeURIComponent(clean(h.get('x-vercel-ip-city'), '未知地区'));
  const region = clean(h.get('x-vercel-ip-country-region'));
  const country = clean(h.get('x-vercel-ip-country'));

  let location = city;
  if (location === '未知地区') {
    location = region || country || '未知地区';
  }

  return NextResponse.json({
    ip: getIp(request),
    city,
    region,
    country,
    location
  });
}
