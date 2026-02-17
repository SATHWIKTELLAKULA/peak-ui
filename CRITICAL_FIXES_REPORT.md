# Peak AI - Critical Fixes Report

## 1. Model Updates (Strict)
The `PeakModel` map in `lib/openrouter.ts` has been updated to your specifications:
-   **CODE**: `openai/gpt-5.2-codex`
-   **PRO**: `anthropic/claude-4.6-opus`
-   **GENERAL/FLASH**: `openai/gpt-5.2-pro`
-   **DEFAULT**: `openai/gpt-5.2-pro`

## 2. Supabase Connection
-   Verified `lib/supabaseClient.ts` relies on `process.env.NEXT_PUBLIC_SUPABASE_URL`.
-   **Action Required**: Ensure your Vercel/Netlify environment variables are set correctly for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The code will now fail gracefully (return null) instead of crashing with `ENOTFOUND` if keys are missing locally, but it needs real keys for auth to work.

## 3. Dual-Key Logic
-   Verified `lib/openrouter.ts`:
    -   Requests starting with `openai/` -> Use `OPENROUTER_KEY_OPENAI`
    -   Requests starting with `anthropic/` -> Use `OPENROUTER_KEY_ANTHROPIC`

## 4. Language Lock (English Only)
-   Updated system prompt in `lib/openrouter.ts` to: **"You are Peak AI. Respond ONLY in English. Use other languages only if explicitly requested."**
-   Removed strict Telugu instructions.
-   Updated API route fallbacks to explicitly use the new `PeakModel.FLASH` (GPT-5.2 Pro) instead of undefined defaults.

The codebase is now aligned with your requirements.
