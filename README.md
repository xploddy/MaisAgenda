
# +Agenda PWA

A modern, productivity-focused Progressive Web App (PWA) built with React and Vite.

## 🚀 Deployment Guide

### 1. Database Setup (Supabase)

1. Create a new project at [Supabase](https://supabase.com).
2. Go to the SQL Editor in your Supabase dashboard.
3. Open the file `db/schema.sql` from this repository.
4. Copy the contents and run it in the SQL Editor to create tables (`tasks`, `shopping_items`, `transactions`, `events`) and policies.
5. Go to **Project Settings > API**.
6. Copy the **URL** and **anon public** key.

### 2. Environment Variables

Create a file named `.env` in the root directory (do not commit this file):

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Vercel Deployment

1. Install Vercel CLI (optional) or push to GitHub/GitLab/Bitbucket.
2. Import the project into Vercel.
3. In the Vercel Project Settings > Environment Variables, add the same variables as above:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy! 🚀

## 🛠 Development

```bash
npm install
npm run dev
```

## 📱 PWA Features

- Installable on Android/iOS.
- Offline support (cached assets).
- Responsive mobile-first design.

=D