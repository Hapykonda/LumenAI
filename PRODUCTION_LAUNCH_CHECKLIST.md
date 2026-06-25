# LumenAI Production Launch Checklist

This checklist is the exact path to move LumenAI from local build to production.

## 1. Code readiness

- Run `npx tsc --noEmit`.
- Run `npm run lint -- --quiet`.
- Run `npm run build`.
- Run `npm run test:smoke` locally.
- Confirm `/login` loads.
- Confirm `/panel/*` redirects to `/login` when logged out.
- Confirm `/api/widget/chat` returns structured replies with a markdown title.

## 2. Supabase environment values

Copy these from Supabase Project Settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Rules:

- `NEXT_PUBLIC_*` values are allowed in the browser.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it in frontend code.
- Use the production Supabase project, not a temporary test project.

## 3. Google OAuth setup

The frontend already calls:

```ts
supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: `${NEXT_PUBLIC_APP_URL}/auth/confirm?next=/panel` },
});
```

Supabase setup:

- Go to Supabase Dashboard > Authentication > Providers > Google.
- Enable Google.
- Copy the Supabase callback URL shown there.
- Paste Google Client ID and Client Secret after creating the Google OAuth app.

Google Cloud setup:

- Create or open a Google Cloud project.
- Configure OAuth consent screen.
- Create OAuth Client ID for Web application.
- Add the Supabase callback URL as an Authorized redirect URI.
- Save Client ID and Client Secret.

Supabase URL configuration:

- Site URL: `https://your-domain.com`
- Redirect URLs:
  - `https://your-domain.com/auth/confirm`
  - `https://your-domain.com/auth/confirm?next=/panel`
  - `http://localhost:3002/auth/confirm`
  - `http://localhost:3002/auth/confirm?next=/panel`

After changing redirect URLs, test Google login again.

## 4. Vercel deployment

In Vercel:

- Import the Git repo.
- Framework preset: Next.js.
- Root directory: project folder that contains `app`, `package.json`, and `next.config.ts`.
- Build command: `npm run build`.
- Install command: `npm install`.

Environment variables in Vercel Project Settings:

- `NEXT_PUBLIC_APP_URL=https://your-domain.com`
- `NEXT_PUBLIC_SUPABASE_URL=...`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`
- `GROQ_API_KEY=...`

Apply them to Production, Preview, and Development only if each environment uses the same backend.

Redeploy after adding or changing variables.

## 5. Production QA

After deploy:

- Open `https://your-domain.com/login`.
- Test Google login.
- Test magic link login.
- Test password login if enabled.
- Open `/panel/overview`.
- Publish or verify Calibration.
- Open Widget panel and copy the script.
- Install the widget script in a test page.
- Send a real question through the widget.
- Confirm the chat appears in Chat.
- Confirm a lead appears in Leads when there is commercial intent.
- Confirm the widget response starts with a title and structured content.

## 6. Security QA

- Confirm no server-only key appears in the browser bundle or page source.
- Confirm Supabase RLS protects authenticated business data.
- Confirm widget public endpoints only expose public widget data.
- Confirm rate limiting blocks repeated widget chat abuse.
- Confirm production logs do not print API keys.

## 7. Final polish

- Take screenshots of Login, Overview, Calibration, Knowledge, Chat, Widget, Leads, and Settings.
- Check desktop and mobile.
- Fix overflowing text, cramped cards, and empty states.
- Add premium downloadable assets only where they improve clarity:
  - device mockups,
  - empty states,
  - subtle dark gradients,
  - linear enterprise icons,
  - small Lottie/Rive status animations.
