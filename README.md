# Свадебный организатор

PWA для планирования свадьбы: категории, задачи, гости, бюджет, заметки с фото.  
Local-first + синхронизация через Supabase. Несколько пар — каждая видит только свой проект.

## Стек

- React + TypeScript + Vite
- Tailwind CSS
- Dexie (IndexedDB) + Supabase (Postgres, Auth, Storage, Realtime)
- GitHub Pages (деплой)

## Локальная разработка

```bash
npm install
cp .env.example .env
# Заполните VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY
npm run dev
```

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `VITE_SUPABASE_URL` | Project URL из Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Publishable (anon) key |
| `VITE_APP_URL` | URL приложения (dev: `http://localhost:5173`) |

## Supabase Auth — Redirect URLs

**Authentication → URL Configuration:**

- Dev: `http://localhost:5173/**`
- Prod: `https://<username>.github.io/wedding-organizer/**`

## Деплой на GitHub Pages

1. **Settings → Secrets and variables → Actions** — добавьте:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_URL` = `https://darmorey.github.io/wedding-organizer`
2. **Settings → Pages → Source: GitHub Actions**
3. **Supabase → Authentication → URL Configuration** — добавьте prod redirect:
   - `https://darmorey.github.io/wedding-organizer/**`
4. Push в ветку `main` — деплой запустится автоматически.

Сайт: https://darmorey.github.io/wedding-organizer/

Локальная проверка prod-сборки: `npm run build && npm run preview` → откройте URL из терминала.

## Лицензия

Private — личный проект.
