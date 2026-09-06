import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

function adminClient() {
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const dynamic = "force-dynamic";

export async function GET() {
  if (!url || !secretKey) {
    return NextResponse.json({ error: "服务器环境变量未配置完整" }, { status: 500 });
  }

  const supabase = adminClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const activeSince = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

  const { data: visitors, error } = await supabase
    .from("visitor_daily")
    .select("visitor_id,country,region,city,last_seen")
    .eq("visit_date", today);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = visitors || [];
  const online = rows.filter((r) => r.last_seen && r.last_seen >= activeSince).length;

  const counts = new Map();
  for (const r of rows) {
    const place = r.city || r.region || r.country;
    if (!place) continue;
    counts.set(place, (counts.get(place) || 0) + 1);
  }

  const places = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  return NextResponse.json({
    todayVisitors: rows.length,
    onlineVisitors: online,
    places,
  });
}
