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
    return NextResponse.json({ error: "帖子 ID 无效" }, { status: 400 });
  }

  // 先删回复，避免数据库外键没有设置 ON DELETE CASCADE 时删帖失败
  const { error: commentError } = await admin
    .from("comments")
    .delete()
    .eq("post_id", id);

  if (commentError) {
    return NextResponse.json({ error: commentError.message }, { status: 500 });
  }

  const { error: postError } = await admin
    .from("posts")
    .delete()
    .eq("id", id);

  if (postError) {
    return NextResponse.json({ error: postError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
