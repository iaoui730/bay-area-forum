import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

function adminClient() {
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function clean(value, max = 120) {
  if (!value) return null;
  try {
    return decodeURIComponent(String(value)).slice(0, max);
  } catch {
    return String(value).slice(0, max);
  }
}

function getIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || null;
}

export async function POST(request) {
  if (!url || !secretKey) {
    return NextResponse.json({ error: "服务器环境变量未配置完整" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const visitorId = String(body.visitor_id || "").trim();

  if (!visitorId || visitorId.length > 120) {
    return NextResponse.json({ error: "visitor_id 无效" }, { status: 400 });
  }

  const now = new Date();
  const visitDate = now.toISOString().slice(0, 10);

  const country = clean(request.headers.get("x-vercel-ip-country"), 80);
  const region = clean(request.headers.get("x-vercel-ip-country-region"), 120);
  const city = clean(request.headers.get("x-vercel-ip-city"), 120);
  const ip = clean(getIp(request), 64);
  const userAgent = clean(request.headers.get("user-agent"), 500);

  const supabase = adminClient();

  const { data: existing } = await supabase
    .from("visitor_daily")
    .select("pageviews,first_seen")
    .eq("visit_date", visitDate)
    .eq("visitor_id", visitorId)
    .maybeSingle();

  const { error } = await supabase.from("visitor_daily").upsert(
    {
      visit_date: visitDate,
      visitor_id: visitorId,
      ip_address: ip,
      country,
      region,
      city,
      user_agent: userAgent,
      first_seen: existing?.first_seen || now.toISOString(),
      last_seen: now.toISOString(),
      pageviews: Number(existing?.pageviews || 0) + 1,
    },
    { onConflict: "visit_date,visitor_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
