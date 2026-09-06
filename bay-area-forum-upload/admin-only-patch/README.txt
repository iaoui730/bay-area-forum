ADMIN ONLY PATCH

只新增管理员后台，不修改现有首页。

需要上传到现有 bay-area-forum-upload 目录：
- app/admin/page.js
- app/api/admin/_auth.js
- app/api/admin/content/route.js
- app/api/admin/posts/route.js
- app/api/admin/comments/route.js

Vercel 需要已有：
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
