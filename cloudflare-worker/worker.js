/**
 * Peak AI — Cloudflare Workers AI Image Generation Worker
 *
 * SETUP INSTRUCTIONS (do these in the Cloudflare Workers dashboard):
 * ─────────────────────────────────────────────────────────────────────
 * 1. Go to: Workers & Pages → peakai → Settings → Variables & Secrets
 *    Add a new SECRET: Name = "API_KEY", Value = <your chosen secret string>
 *    (Copy this exact secret — you'll need it for your Next.js env too)
 *
 * 2. Go to Settings → AI
 *    Enable the "Workers AI" binding with the name exactly: AI
 *
 * 3. Paste this entire file into the "Edit Code" tab of your Worker.
 *
 * 4. In your Next.js project, add to .env.local AND Vercel env vars:
 *    CF_WORKER_API_KEY=<same secret value you used in step 1>
 * ─────────────────────────────────────────────────────────────────────
 */

export default {
    async fetch(request, env) {
        // ── CORS headers (allow requests from your Vercel deployment) ──
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        };

        // ── Handle CORS preflight ──
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        // ── Only allow POST ──
        if (request.method !== "POST") {
            return new Response(
                JSON.stringify({ error: "Method not allowed. Use POST." }),
                {
                    status: 405,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // ── Authorization check ──
        const authHeader = request.headers.get("Authorization") || "";
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7)
            : authHeader;

        if (!env.API_KEY || token !== env.API_KEY) {
            return new Response(
                JSON.stringify({ error: "Unauthorized. Invalid or missing API key." }),
                {
                    status: 401,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // ── Parse request body ──
        let prompt;
        try {
            const body = await request.json();
            prompt = body.prompt;
        } catch {
            return new Response(
                JSON.stringify({ error: "Invalid JSON body." }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
            return new Response(
                JSON.stringify({ error: "Missing or empty 'prompt' in request body." }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // ── Generate image with Cloudflare Workers AI ──
        try {
            const enhancedPrompt = `${prompt.trim()}, 4K, highly detailed, photorealistic, masterpiece`;

            const imageStream = await env.AI.run(
                "@cf/stabilityai/stable-diffusion-xl-base-1.0",
                { prompt: enhancedPrompt }
            );

            // Workers AI returns a ReadableStream of image bytes (JPEG)
            return new Response(imageStream, {
                status: 200,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "image/jpeg",
                    "Cache-Control": "no-store",
                },
            });
        } catch (err) {
            console.error("[Peak AI Worker] Generation error:", err);
            return new Response(
                JSON.stringify({
                    error: "Image generation failed. Please try again.",
                    detail: err instanceof Error ? err.message : String(err),
                }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }
    },
};
