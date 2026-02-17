# Language System Fix

I have updated the application to enforce English as the strict default language while respecting specific user choices.

### Key Changes
1.  **Strict English Enforcement**: Modified system prompts in `lib/openrouter.ts` and `app/api/search/route.ts` to explicitly instruct the AI to use Standard English when `lang="en"`.
2.  **Explicit Rules**: Added mandatory rules for Telugu (Script ONLY) and Hindi (Devanagari ONLY) to prevent script mixing.
3.  **Default Handling**: Verified `SettingsContext` provides a clean "en" default, preventing leakage from previous sessions.

The system will now strictly adhere to the selected language.
