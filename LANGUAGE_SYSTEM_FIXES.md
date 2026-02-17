# Language System Fixes Implemented

1.  **Strict English Default on Load**:
    *   Modified `contexts/SettingsContext.tsx` to COMMENT OUT the logic that loads `language` from `localStorage`.
    *   Modified `contexts/SettingsContext.tsx` to STOP saving `language` to `localStorage`.
    *   Result: Every refresh or new session starts with `defaults.language = "en"`.

2.  **Strict System Prompts**:
    *   Updated `lib/openrouter.ts`: Added explicit rules: `If "en", respond in Standard English. Do NOT mix scripts.`
    *   Updated `app/api/search/route.ts`: Added similar strict rules for Bytez/fallback.

3.  **UI Sync**:
    *   Verified `app/search/page.tsx` passes `&lang=${language}` in the API call, ensuring the backend receives the *current* UI state (which defaults to English but can be toggled).

This ensures the user starts in English and stays in English unless they manually switch, and the AI is chemically compelled to speak English when "en" is active.
