"use client";

import { useEffect, useState } from "react";

function getVisitorId() {
  const key = "familiar_visitor_id";
  let value = localStorage.getItem(key);
  if (!value) {
    value =
      (globalThis.crypto?.randomUUID?.() ||
        `v_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(key, value);
  }
  return value;
}

export default function FamiliarBulletin() {
  const [stats, setStats] = useState(null);

  async function ping() {
    const visitorId = getVisitorId();

    await fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitor_id: visitorId }),
    }).catch(() => {});

    const res = await fetch("/api/public-stats", { cache: "no-store" }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setStats(data);
    }
  }

  useEffect(() => {
    ping();
    const timer = setInterval(ping, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  if (!stats) return null;

  const places = (stats.places || [])
    .map((p) => `${p.name} ${p.count}`)
    .join(" · ");

  return (
    <section
      style={{
        border: "1px solid #e5e5e5",
        borderRadius: 12,
        padding: "14px 16px",
        margin: "14px 0 18px",
        background: "#fafafa",
        lineHeight: 1.7,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>熟人公告栏</div>
      <div style={{ fontSize: 14 }}>
        今天有 <b>{stats.todayVisitors}</b> 位熟人来过 · 现在有{" "}
        <b>{stats.onlineVisitors}</b> 位熟人在这里
      </div>
      {places && (
        <div style={{ fontSize: 13, opacity: 0.72, marginTop: 2 }}>
          今天的熟人来自：{places}
        </div>
      )}
    </section>
  );
}
