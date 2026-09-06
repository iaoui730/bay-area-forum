import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

export function getAdminClient() {
  if (!url || !secretKey) {
    throw new Error("服务器环境变量未配置完整");
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function requireAdmin(request) {
  if (!url || !publishableKey || !secretKey) {
    return { error: "服务器环境变量未配置完整", status: 500 };
  }

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return { error: "未登录", status: 401 };
  }

  const authClient = createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(token);

  if (userError || !userData?.user) {
    return { error: "登录已失效", status: 401 };
  }

  const admin = getAdminClient();

  const { data: adminRow, error: adminError } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (adminError) {
    return { error: "管理员权限检查失败", status: 500 };
  }

  if (!adminRow) {
    return { error: "这个账号不是管理员", status: 403 };
  }

  return { user: userData.user, admin };
}
