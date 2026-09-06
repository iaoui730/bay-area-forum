"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState(null);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const token = session?.access_token;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  async function api(path, options = {}) {
    const res = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "请求失败");
    return data;
  }

  async function signIn(e) {
    e.preventDefault();
    setMessage("正在登录…");
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage("登录失败：" + error.message);
      return;
    }
    setPassword("");
    setMessage("");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setPosts([]);
    setComments([]);
    setMessage("");
  }

  async function loadData() {
    setMessage("正在加载…");
    try {
      const data = await api("/api/admin/content");
      setPosts(data.posts || []);
      setComments(data.comments || []);
      setMessage("");
    } catch (err) {
      setMessage(err.message);
      if (err.message.includes("管理员")) {
        await supabase.auth.signOut();
      }
    }
  }

  async function deletePost(id) {
    if (!window.confirm("确定删除这篇帖子吗？相关回复也会一起删除。")) return;
    try {
      await api("/api/admin/posts", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function deleteComment(id) {
    if (!window.confirm("确定删除这条回复吗？")) return;
    try {
      await api("/api/admin/comments", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  const commentsByPost = useMemo(() => {
    const map = {};
    for (const c of comments) {
      (map[c.post_id] ||= []).push(c);
    }
    return map;
  }, [comments]);

  if (loading) {
    return <main style={styles.main}><div style={styles.card}>加载中…</div></main>;
  }

  if (!session) {
    return (
      <main style={styles.main}>
        <div style={styles.card}>
          <h1 style={styles.title}>Admin</h1>
          <p style={styles.muted}>管理员入口</p>
          <form onSubmit={signIn} style={styles.form}>
            <input
              style={styles.input}
              type="email"
              autoComplete="email"
              placeholder="管理员邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              style={styles.input}
              type="password"
              autoComplete="current-password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button style={styles.primary} type="submit">登录</button>
          </form>
          {message && <p style={styles.message}>{message}</p>}
        </div>
      </main>
    );
  }

  return (
    <main style={styles.main}>
      <div style={styles.panel}>
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.title}>Admin</h1>
            <p style={styles.muted}>帖子与回复管理</p>
          </div>
          <div style={styles.topActions}>
            <button style={styles.secondary} onClick={loadData}>刷新</button>
            <button style={styles.secondary} onClick={signOut}>退出</button>
          </div>
        </div>

        {message && <p style={styles.message}>{message}</p>}

        {posts.length === 0 ? (
          <div style={styles.empty}>暂无帖子</div>
        ) : (
          posts.map((post) => (
            <section key={post.id} style={styles.post}>
              <div style={styles.postHead}>
                <div>
                  <div style={styles.postTitle}>{post.title || "无标题"}</div>
                  <div style={styles.meta}>
                    帖子 #{post.id} · {formatTime(post.created_at)}
                  </div>
                </div>
                <button style={styles.danger} onClick={() => deletePost(post.id)}>
                  删除帖子
                </button>
              </div>

              <div style={styles.content}>{post.content}</div>

              <div style={styles.comments}>
                <div style={styles.commentHeading}>
                  回复（{(commentsByPost[post.id] || []).length}）
                </div>

                {(commentsByPost[post.id] || []).length === 0 ? (
                  <div style={styles.muted}>暂无回复</div>
                ) : (
                  (commentsByPost[post.id] || []).map((comment) => (
                    <div key={comment.id} style={styles.comment}>
                      <div style={styles.commentText}>{comment.content}</div>
                      <div style={styles.commentBottom}>
                        <span style={styles.meta}>
                          回复 #{comment.id} · {formatTime(comment.created_at)}
                        </span>
                        <button
                          style={styles.smallDanger}
                          onClick={() => deleteComment(comment.id)}
                        >
                          删除回复
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}

function formatTime(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

const styles = {
  main: {
    minHeight: "100vh",
    background: "#f5f5f5",
    color: "#111",
    padding: "40px 16px",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  card: {
    maxWidth: 420,
    margin: "80px auto",
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: 24,
  },
  panel: {
    maxWidth: 1000,
    margin: "0 auto",
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  topActions: {
    display: "flex",
    gap: 8,
  },
  title: {
    margin: 0,
    fontSize: 28,
  },
  muted: {
    color: "#777",
    margin: "6px 0 0",
    fontSize: 14,
  },
  form: {
    display: "grid",
    gap: 12,
    marginTop: 20,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #ccc",
    borderRadius: 8,
    padding: "12px 14px",
    fontSize: 16,
    background: "#fff",
    color: "#111",
  },
  primary: {
    border: 0,
    borderRadius: 8,
    padding: "12px 16px",
    background: "#111",
    color: "#fff",
    cursor: "pointer",
    fontSize: 15,
  },
  secondary: {
    border: "1px solid #ccc",
    borderRadius: 8,
    padding: "9px 12px",
    background: "#fff",
    color: "#111",
    cursor: "pointer",
  },
  message: {
    marginTop: 14,
    color: "#555",
  },
  empty: {
    padding: 30,
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 12,
    textAlign: "center",
  },
  post: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  postHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  postTitle: {
    fontWeight: 700,
    fontSize: 20,
  },
  meta: {
    color: "#888",
    fontSize: 12,
    marginTop: 5,
  },
  content: {
    marginTop: 16,
    whiteSpace: "pre-wrap",
    lineHeight: 1.6,
  },
  danger: {
    border: "1px solid #b00020",
    borderRadius: 8,
    background: "#fff",
    color: "#b00020",
    padding: "8px 10px",
    cursor: "pointer",
    flexShrink: 0,
  },
  comments: {
    marginTop: 20,
    paddingTop: 16,
    borderTop: "1px solid #eee",
  },
  commentHeading: {
    fontWeight: 700,
    marginBottom: 10,
  },
  comment: {
    padding: "12px 0",
    borderTop: "1px solid #f0f0f0",
  },
  commentText: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.5,
  },
  commentBottom: {
    marginTop: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  smallDanger: {
    border: 0,
    background: "transparent",
    color: "#b00020",
    cursor: "pointer",
    padding: 0,
  },
};
