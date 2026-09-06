import { NextResponse } from "next/server";
import { requireAdmin } from "../_auth";

export async function DELETE(request) {
  const auth = await requireAdmin(request);

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { admin } = auth;
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ error: "回复 ID 无效" }, { status: 400 });
  }

  const { error } = await admin
    .from("comments")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
