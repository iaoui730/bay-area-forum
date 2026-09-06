import { NextResponse } from "next/server";
import { requireAdmin } from "../_auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireAdmin(request);

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { admin } = auth;

  const [{ data: posts, error: postsError }, { data: comments, error: commentsError }] =
    await Promise.all([
      admin
        .from("posts")
        .select("id,title,content,images,created_at")
        .order("created_at", { ascending: false }),
      admin
        .from("comments")
        .select("id,post_id,content,created_at")
        .order("created_at", { ascending: true }),
    ]);

  if (postsError || commentsError) {
    return NextResponse.json(
      { error: postsError?.message || commentsError?.message || "读取失败" },
      { status: 500 }
    );
  }

  return NextResponse.json({ posts: posts || [], comments: comments || [] });
}
