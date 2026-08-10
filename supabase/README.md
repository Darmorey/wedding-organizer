# Supabase setup

## 1. Run migration

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. **SQL Editor** → **New query**
3. Paste contents of `migrations/001_initial_schema.sql`
4. Click **Run**

## 2. Auth redirect URLs

**Authentication → URL Configuration**

| Field | Dev | Prod (after GitHub Pages) |
|-------|-----|---------------------------|
| Site URL | `http://localhost:5173` | `https://darmorey.github.io/wedding-organizer/` |
| Redirect URLs | `http://localhost:5173/**` | `https://darmorey.github.io/wedding-organizer/**` |

## 3. Local `.env`

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_APP_URL=http://localhost:5173
```

## 4. Email auth

**Authentication → Providers → Email** — enabled (default).

For password reset, the link redirects to `/auth/reset-password`.

## 5. Grants (если ошибка 403 при создании проекта)

Если в консоли браузера: `permission denied for table wedding_projects` — выполни **`migrations/002_grants.sql`** в SQL Editor.

## 6. Realtime (для синхронизации между партнёрами)

**Database → Replication** — включите replication для таблиц:
- `categories`
- `tasks`
- `guests`

Без этого изменения будут синхронизироваться при входе и по кнопке, но не мгновенно между устройствами.
