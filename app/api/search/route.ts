import { NextRequest, NextResponse } from "next/server";
import { bytez } from "@/lib/bytez";
import { callOpenRouter, PeakModel } from "@/lib/openrouter";
import jwt from "jsonwebtoken";
import { supabase } from "@/lib/supabase";

async function logErrorToSupabase(error: any, context: string) {
    if (!supabase) return;
    try {
        await supabase.from("error_logs").insert({
            error_message: error instanceof Error ? error.message : String(error),
            context,
            timestamp: new Date().toISOString(),
        });
    } catch (e) {
        console.error("Failed to log to Supabase:", e);
    }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// --- Helper: OpenRouter Fallback / Main Handler ---
// (Refactored to lib/openrouter.ts)

// --- Helper: Pollinations.ai (Free Fallback) ---
function callPollinationsImage(query: string) {
    const cleanPrompt = encodeURIComponent(query.trim());
    const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}`;

    return {
        detailed_answer: `IMAGE_DATA:${imageUrl}`,
        direct_answer: "Visualizing with Pollinations (Free)..."
    };
}

// --- Helper: Pollinations.ai Video (Free) ---
async function callPollinationsVideo(query: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for video

    try {
        // Using Gen Endpoint for video models
        const response = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: [
                    { role: "user", content: query }
                ],
                model: "flux-video", // or 'luma'
                seed: Math.floor(Math.random() * 1000)
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Pollinations Video Failed: ${response.status}`);
        }

        // The Gen endpoint returns an OpenAI-compatible JSON
        const data = await response.json();
        const videoUrl = data.choices[0]?.message?.content || "";

        // Fallback or validation
        if (!videoUrl.startsWith("http")) {
            throw new Error("No video URL returned");
        }

        return {
            detailed_answer: `VIDEO_DATA:${videoUrl}`,
            direct_answer: "Directing Scene..."
        };
    } finally {
        clearTimeout(timeoutId);
    }
}

// --- Helper: Stability AI (Ultra Mode) ---
async function callStabilityAI(query: string) {
    const apiKey = process.env.STABILITY_KEY;
    if (!apiKey) {
        console.warn("STABILITY_KEY missing. Falling back...");
        return null;
    }

    const formData = new FormData();
    formData.append("prompt", query);
    formData.append("output_format", "webp");

    try {
        const response = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Accept": "image/*"
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Stability AI Error: ${response.status}: ${await response.text()}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        return `IMAGE_DATA:data:image/webp;base64,${base64}`;
    } catch (e) {
        console.error("Stability generation failed:", e);
        return null;
    }
}

// --- Helper: Tavily Search ---
async function callTavily(query: string) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return null;

    try {
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key: apiKey,
                query: query,
                search_depth: "basic",
                include_answer: true,
                max_results: 5,
                topic: "general"
            })
        });

        if (!response.ok) return null;

        const data = await response.json();
        // Return context string
        return data.results.map((r: any) => `[${r.title}](${r.url}): ${r.content}`).join("\n");
    } catch (e) {
        console.error("Tavily Search Failed:", e);
        return null;
    }
}

// --- Helper: Fetch Anime Style Reference (HF Datasets) ---
async function fetchAnimeStyleReference(): Promise<string | null> {
    const token = process.env.HUGGINGFACE_TOKEN;
    if (!token) {
        console.warn("HUGGINGFACE_TOKEN is missing. Skipping anime style enhancement.");
        return null;
    }

    try {
        // Random offset for variety (Dataset size ~330k)
        const randomOffset = Math.floor(Math.random() * 5000);
        const url = `https://datasets-server.huggingface.co/rows?dataset=none-yet/anime-captions&config=default&split=train&offset=${randomOffset}&length=1`;

        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.warn(`HF Dataset Fetch Failed: ${response.status}`);
            return null;
        }

        const data = await response.json();
        if (data.rows && data.rows.length > 0) {
            return data.rows[0].row.text; // The caption
        }
    } catch (e) {
        console.error("Error fetching anime style reference:", e);
    }
    return null;
}

// --- Helper: Auto-Enhance Prompt ---
async function enhanceAnimePrompt(userQuery: string, styleReference: string): Promise<string> {
    // We use callOpenRouter (or a fast chat model) to merge the styles
    // System prompt to guide the style transfer - Enforce English for Image Gen
    const systemPrompt = "You are a professional prompt engineer for anime generation. Your task is to enhance the user's prompt using the provided Style Reference. Extract the artistic style descriptors (lighting, medium, shading, vibe) from the Reference and apply them to the User's subject. Do NOT change the subject. Output ONLY the final enhanced prompt in ENGLISH.";

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `User Request: "${userQuery}"\nStyle Reference: "${styleReference}"\n\nEnhanced Prompt:` }
    ];

    try {
        // Use a fast model for enhancement (e.g., Haiku or Flash if available, referencing callOpenRouter default)
        // Using PeakModel.DEFAULT (gpt-3.5-turbo) as a fast fallback
        const result = await callOpenRouter("ENHANCE", messages, PeakModel.DEFAULT);

        // Return the detailed answer which contains the content
        return result.detailed_answer || userQuery;
    } catch (e) {
        console.warn("Prompt Enhancement Failed, using original query:", e);
        return userQuery;
    }
}

// --- Helper: Hugging Face Image Generation (FLUX - High Quality) ---
async function callHuggingFaceImage(query: string) {
    const token = process.env.HUGGINGFACE_TOKEN;
    if (!token) {
        console.warn("HUGGINGFACE_TOKEN missing. Skipping HF generation.");
        return null;
    }

    // Enhanced Prompt for Photorealism
    const enhancedQuery = `${query}, 4K, highly detailed, photorealistic, masterpiece, 8k resolution`;

    try {
        console.log(`[Hugging Face] Generating image with FLUX.1-schnell for: "${enhancedQuery}"`);

        // Direct HF Inference API call
        const response = await fetch(
            "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "x-use-cache": "false"
                },
                body: JSON.stringify({
                    inputs: enhancedQuery,
                    parameters: {
                        width: 1024,
                        height: 1024
                    }
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Hugging Face] Error ${response.status}: ${errorText}`);
            throw new Error(`HF API Error: ${response.status}`);
        }

        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        return `IMAGE_DATA:data:image/jpeg;base64,${base64}`;

    } catch (e) {
        console.error("[Hugging Face] Generation Failed:", e);
        return null;
    }
}

// --- Helper: Hugging Face Video Generation (CogVideoX) ---
async function callHuggingFaceVideo(query: string) {
    const token = process.env.HUGGINGFACE_TOKEN;
    if (!token) {
        console.warn("HUGGINGFACE_TOKEN missing. Skipping HF video.");
        return null;
    }

    const modelId = "THUDM/CogVideoX-5b";
    const apiUrl = `https://api-inference.huggingface.co/models/${modelId}`;

    // Retry logic parameters
    const maxRetries = 5;
    const retryDelay = 5000; // 5 seconds

    const cleanQuery = query.replace("/video", "").replace("/animate", "").trim();

    console.log(`[Hugging Face] Director Mode: Generating video with ${modelId} for: "${cleanQuery}"`);

    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ inputs: cleanQuery }),
            });

            if (response.status === 503) {
                // Model is loading
                const data = await response.json();
                const estimatedTime = data.estimated_time || retryDelay / 1000;
                console.warn(`[Hugging Face] Model loading. Retrying in ${estimatedTime}s... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, estimatedTime * 1000));
                continue;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HF Video API Error ${response.status}: ${errorText}`);
            }

            // Success - Video blob returned
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString('base64');

            // Return data URI for video (mp4 usually)
            return `VIDEO_DATA:data:video/mp4;base64,${base64}`;

        } catch (e) {
            console.error(`[Hugging Face] Video generation attempt ${i + 1} failed:`, e);
            if (i === maxRetries - 1) return null; // Fallback after all retries
            await new Promise(resolve => setTimeout(resolve, 2000)); // Standard backoff
        }
    }

    return null;
}

// --- Helper: Kling AI (Direct Mode) ---
async function callKlingAI(query: string) {
    const accessKey = process.env.KLING_ACCESS_KEY;
    const secretKey = process.env.KLING_SECRET_KEY;

    if (!accessKey || !secretKey) {
        console.warn("KLING_ACCESS_KEY or KLING_SECRET_KEY missing. Skipping Kling AI.");
        return null;
    }

    // 1. Generate JWT
    const token = jwt.sign(
        {
            iss: accessKey,
            exp: Math.floor(Date.now() / 1000) + 1800, // 30 mins
            nbf: Math.floor(Date.now() / 1000) - 5,
        },
        secretKey,
        { algorithm: "HS256", header: { alg: "HS256", typ: "JWT" } }
    );

    console.log(`[Director Mode] Generated Kling Auth Token.`);

    try {
        // 2. Submit Task
        console.log(`[Director Mode] Submitting to Kling AI (Singapore)... Query: "${query}"`);
        const submitResponse = await fetch("https://api-singapore.klingai.com/v1/videos/text2video", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "kling-v1", // Default model identifier
                prompt: query,
                duration: "5", //  "5" usually maps to 5s standard
                aspect_ratio: "16:9",
                // callback_url: "..." // Optional
            }),
        });

        if (!submitResponse.ok) {
            const errorText = await submitResponse.text();
            throw new Error(`Kling Submit Failed ${submitResponse.status}: ${errorText}`);
        }

        const submitData = await submitResponse.json();
        // Check for task_id in data.data.task_id or similar structure. Kling API often wraps in { code: 0, message: "", data: { task_id: ... } }
        // Let's assume standard structure based on docs or common practice.
        const taskId = submitData.data?.task_id || submitData.task_id;

        if (!taskId) {
            throw new Error(`No task_id returned. Response: ${JSON.stringify(submitData)}`);
        }

        console.log(`[Director Mode] Task ID: ${taskId}. Polling for result...`);

        // 3. Poll for Result
        const maxAttempts = 20; // 20 * 5s = 100s, theoretically. User asked for 15s interval.
        // User asked for 15s interval. 60s timeout limit means max 4 checks.
        // We will try to fit within timeout context or return intermediate status if we could (but route currently returns final).
        // Given polling requirement "every 15 seconds", we do:

        for (let i = 0; i < 10; i++) { // Try up to 150s (if function allows). Vercel limit will cut it off.
            await new Promise((resolve) => setTimeout(resolve, 15000)); // 15s interval

            const checkResponse = await fetch(`https://api-singapore.klingai.com/v1/videos/text2video/${taskId}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });

            if (!checkResponse.ok) continue;

            const checkData = await checkResponse.json();
            const taskStatus = checkData.data?.task_status || checkData.task_status; // 'submitted', 'processing', 'succeed', 'failed'

            console.log(`[Director Mode] Status: ${taskStatus}`);

            if (taskStatus === "succeed" || taskStatus === "success") {
                const videos = checkData.data?.task_result?.videos || checkData.task_result?.videos;
                if (videos && videos.length > 0) {
                    const videoUrl = videos[0].url;

                    // Increment Usage in Supabase
                    if (supabase) {
                        try {
                            const today = new Date().toISOString().split('T')[0];
                            const { data } = await supabase.from("system_stats").select("kling_usage").eq("date", today).single();
                            const current = data?.kling_usage || 0;
                            await supabase.from("system_stats").upsert({ date: today, kling_usage: current + 11 }, { onConflict: "date" });
                        } catch (err) { console.error("Failed to update Kling usage", err); }
                    }

                    return `VIDEO_DATA:${videoUrl}`;
                }
            } else if (taskStatus === "failed") {
                throw new Error(`Kling Task Failed: ${checkData.data?.task_status_msg || "Unknown error"}`);
            }
        }

        throw new Error("Polling timed out. Video might still be processing.");

    } catch (e: any) {
        console.error("[Director Mode] Kling AI Failed:", e);
        await logErrorToSupabase(e, "Kling AI Video Generation");

        // Check for credit/quota specific errors
        const errorMsg = e.message || String(e);
        if (errorMsg.includes("402") || errorMsg.includes("429") || errorMsg.includes("insufficient") || errorMsg.includes("credit") || errorMsg.includes("quota") || errorMsg.includes("balance")) {
            throw new Error("Our Director is currently busy filming. Please come back tomorrow for your next masterpiece!");
        }
        return null; // Fallback to other providers
    }
}

// --- Helper: Puter.js (General Chat) ---
async function callPuter(query: string, messages?: any[]) {
    try {
        // Dynamic import to handle SSR/Edge constraints
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const puter = require('@heyputer/puter.js').default || require('@heyputer/puter.js');

        console.log("[Puter] Generating response via gpt-5-nano...");

        // Construct prompt from messages if available
        let prompt = query;
        if (messages && messages.length > 0) {
            prompt = messages.map((m: any) => {
                let contentStr = "";
                if (Array.isArray(m.content)) {
                    contentStr = m.content.map((c: any) => c.text || "[Media]").join(" ");
                } else {
                    contentStr = m.content;
                }
                return `${m.role}: ${contentStr}`;
            }).join("\n");
        }

        // Attempt to use Puter AI Chat
        if (puter.ai && puter.ai.chat) {
            const response = await puter.ai.chat(prompt, { model: 'gpt-5-nano' });
            // Puter response format might vary, usually it returns a string or object
            const text = typeof response === 'string' ? response : (response?.message?.content || JSON.stringify(response));

            return {
                detailed_answer: text,
                direct_answer: text.slice(0, 150) + "..."
            };
        } else {
            throw new Error("Puter AI module not found.");
        }
    } catch (e) {
        console.warn("[Puter] Failed:", e);
        return null;
    }
}

// --- Helper: Bytez Primary ---
async function callBytez(query: string, mode: string = "chat", messages?: any[], quality: string = "standard", lang: string = "en") {
    // 1. Smart Trigger: Check for "free" or "fast" keywords in Image/Video mode
    const lowerQuery = query.toLowerCase();
    const isImageMode = mode === "image" || mode === "visualize";
    const isVideoMode = mode === "video";

    // --- MODE ROUTING (Simplified for Free/Gemini Priority) ---

    // 1. THINK MODE
    if (mode === "think") {
        console.log("[Think Mode] Routing to PeakModel.THINK...");
        return await callOpenRouter(query, messages, PeakModel.THINK, lang);
    }

    // 2. FLASH MODE
    if (mode === "flash") {
        console.log("[Flash Mode] Routing to PeakModel.FLASH...");
        return await callOpenRouter(query, messages, PeakModel.FLASH, lang);
    }

    // 3. CHAT MODE
    if (mode === "chat") {
        console.log("[Chat Mode] Routing to PeakModel.DEFAULT...");
        return await callOpenRouter(query, messages, PeakModel.DEFAULT, lang);
    }

    // --- HUGGING FACE (FLUX.1-schnell) - PRIMARY FOR IMAGE ---
    if (isImageMode && process.env.HUGGINGFACE_TOKEN && !lowerQuery.includes("pollinations")) {
        console.log("[Visualize] using Hugging Face (FLUX.1-schnell)");
        const hfImage = await callHuggingFaceImage(query);
        if (hfImage) {
            return {
                detailed_answer: hfImage,
                direct_answer: "Generated with FLUX.1-schnell (High Quality)."
            };
        }
        console.warn("Hugging Face failed, falling back to Stability/Pollinations...");
    }

    // --- STABILITY AI (Fallback for Visuals) ---
    if (isImageMode && process.env.STABILITY_KEY && !lowerQuery.includes("free") && !lowerQuery.includes("pollinations")) {
        console.log("[Visualize] using Stability AI Engine (Fallback)");
        const stabilityImage = await callStabilityAI(query);
        if (stabilityImage) {
            return {
                detailed_answer: stabilityImage,
                direct_answer: "Generated with Stability AI (Ultra Quality)."
            };
        }
    }

    if (isImageMode) {
        console.log("[Smart Trigger] Switching to Pollinations.ai (Image - Free Fallback)");
        return callPollinationsImage(query);
    }

    // --- DIRECTOR MODE (Video) ---
    if (isVideoMode) {
        console.log("[Director Mode] Engaged.");

        // 1. Try Kling AI (Production)
        if (process.env.KLING_ACCESS_KEY) {
            console.log("[Director Mode] Using Kling AI (Singapore)...");
            const klingVideo = await callKlingAI(query);
            if (klingVideo) {
                return {
                    detailed_answer: klingVideo,
                    direct_answer: "Scene rendered with Kling AI (Standard Mode)."
                };
            }
            console.warn("[Director Mode] Kling AI failed, falling back to Hugging Face...");
        }

        // 2. Try Hugging Face (CogVideoX)
        if (process.env.HUGGINGFACE_TOKEN && !lowerQuery.includes("pollinations")) {
            console.log("[Director Mode] Using Hugging Face (CogVideoX-5b)...");
            const hfVideo = await callHuggingFaceVideo(query);
            if (hfVideo) {
                return {
                    detailed_answer: hfVideo,
                    direct_answer: "Scene rendered with CogVideoX-5b."
                };
            }
            console.warn("[Director Mode] Hugging Face failed, falling back to Pollinations...");
        }

        console.log("[Director Mode] Switching to Pollinations.ai (Video Fallback)");
        // Video might be too slow to enhance, but let's try if it's explicitly anime
        if (lowerQuery.includes("anime")) {
            const styleRef = await fetchAnimeStyleReference();
            if (styleRef) {
                const enhanced = await enhanceAnimePrompt(query, styleRef);
                console.log(`[Director Mode] Enhanced: "${enhanced}"`);
                return callPollinationsVideo(enhanced);
            }
        }
        return callPollinationsVideo(query);
    }

    // --- OTHER MODES ---

    // 1. CODE MODE
    if (mode === "code") {
        console.log("[Code Mode] Routing to PeakModel.CODE");
        return await callOpenRouter(query, messages, PeakModel.CODE, lang);
    }

    // 2. PRO / ANALYZE MODE
    // Pro Mode / Analyze Mode -> Fetch Context via Tavily
    let searchContext = "";
    if (mode === "pro" || mode === "analyze") {
        console.log(`[${mode} Mode] Fetching real-time data via Tavily...`);
        const tavilyData = await callTavily(query);
        if (tavilyData) {
            searchContext = `\n\n[REAL-TIME SEARCH CONTEXT]:\n${tavilyData}\n\nUse this context to answer the user's question accurately.`;
        }

        console.log(`[${mode} Mode] Routing to PeakModel.PRO`);
        const enrichedQuery = query + searchContext;
        return await callOpenRouter(enrichedQuery, messages, PeakModel.PRO, lang);
    }

    // For any unhandled modes, fallback to Flash (Gemini)
    console.log(`[Bytez] Default Fallback (Mode: ${mode}) -> PeakModel.DEFAULT`);
    return await callOpenRouter(query, messages, PeakModel.DEFAULT, lang);
}


// --- Helper: Intent Detection ---
function detectIntent(query: string): string | null {
    const lower = query.toLowerCase().trim();

    // Explicit commands
    if (lower.startsWith("/image") || lower.startsWith("/draw") || lower.startsWith("/generate")) {
        return "image";
    }
    if (lower.startsWith("/code") || lower.startsWith("/debug") || lower.startsWith("/refactor")) {
        return "code";
    }

    // Natural language patterns
    if (
        lower.includes("generate an image") ||
        lower.includes("create an image") ||
        lower.includes("draw an image") ||
        lower.includes("draw me a") ||
        lower.includes("show me a picture of") ||
        lower.includes("visualize")
    ) {
        return "image";
    }

    if (
        lower.includes("write a function") ||
        lower.includes("code for") ||
        lower.includes("debug this") ||
        lower.includes("react component") ||
        lower.includes("script to") ||
        lower.includes("python code") ||
        lower.includes("javascript code") ||
        lower.includes("typescript code")
    ) {
        return "code";
    }

    return null;
}




// --- Helper: Cerebras API (Flash Mode - <1s Latency) ---
async function callCerebras(input: string | any[]) {
    const apiKey = process.env.CEREBRAS_API_KEY;
    if (!apiKey) {
        console.warn("CEREBRAS_API_KEY missing. Falling back...");
        return null;
    }

    const messages = Array.isArray(input) ? input : [{ role: "user", content: input }];

    // Strict Performance: Hardcode System Prompt to English
    const finalMessages = [
        { role: "system", content: "You are Peak AI. Respond concisely in English." },
        ...messages.filter((m: any) => m.role !== "system")
    ];

    try {
        console.log("[Flash Mode] Routing to Cerebras (Llama 3.1-8b)...");
        const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama3.1-8b",
                stream: false, // For absolute fastest <1s simple response, disable stream or handle efficiently. Let's use simple JSON for speed unless streaming is vital for UI. The user asked for <1s response time.
                // Actually, duplicate `callBytez` logic uses streaming. Let's stick to simple text for Flash Speed if that's the goal, or stream if possible. The UI expects stream or text.
                // Let's use non-streaming for "Instant" feel if the response is short, or stream. The previous implementation used stream.
                // Let's go with non-streaming for simplicity and speed of *connection* (less overhead). 
                max_tokens: 300,
                temperature: 0.2,
                messages: finalMessages,
            }),
        });

        if (!response.ok) {
            throw new Error(`Cerebras API Error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || "";

        return {
            detailed_answer: text,
            direct_answer: text.slice(0, 150) + "..."
        };

    } catch (e) {
        console.error("[Flash Mode] Cerebras Call Failed:", e);
        return null;
    }
}


// --- API Handlers ---

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get("q");
    let mode = request.nextUrl.searchParams.get("mode") || "chat";
    const quality = request.nextUrl.searchParams.get("quality") || "standard";
    const lang = request.nextUrl.searchParams.get("lang") || "en";

    if (!query) {
        return NextResponse.json(
            { error: "Query parameter 'q' is required" },
            { status: 400 }
        );
    }

    // Smart Routing: Override mode if intent is detected
    const detectedMode = detectIntent(query);
    if (detectedMode) {
        console.log(`[Smart Routing] Overriding mode '${mode}' to '${detectedMode}' based on query.`);
        mode = detectedMode;
    }

    try {
        // 1. Try Bytez (which handles Puter/Gemini/DeepSeek)
        const result = await callBytez(query, mode, undefined, quality, lang);
        return NextResponse.json(result);
    } catch (error: any) {
        // Global Error Handler for Route
        console.error("Global Request Failed:", error);
        await logErrorToSupabase(error, "Global Route Handler");

        const msg = error instanceof Error ? error.message : String(error);
        let userMessage = msg;

        // Mask technical credit errors with friendly message
        if (msg.includes("401") || msg.includes("402") || msg.includes("429") || msg.includes("insufficient_quota") || msg.includes("billing") || msg.includes("credit") || msg.includes("key")) {
            userMessage = "Our AI is resting. Please come back tomorrow! 🚀";
        }

        return NextResponse.json({
            detailed_answer: `Error: ${userMessage}`,
        });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { messages, quality = "standard", lang = "en" } = body;
        let { mode = "chat" } = body;

        let query = "";
        if (messages && Array.isArray(messages) && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (Array.isArray(lastMsg.content)) {
                const textPart = lastMsg.content.find((p: any) => p.type === "text");
                query = textPart ? textPart.text : "";
            } else {
                query = lastMsg.content;
            }
        }

        // Smart Routing: Override mode if intent is detected
        if (query) {
            const detectedMode = detectIntent(query);
            if (detectedMode) {
                console.log(`[Smart Routing] Overriding mode '${mode}' to '${detectedMode}' based on query.`);
                mode = detectedMode;
            }
        }



        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: "Messages array is required" },
                { status: 400 }
            );
        }

        try {
            // 1. Try Bytez
            const result = await callBytez(query, mode, messages, quality, lang);
            return NextResponse.json(result);
        } catch (e) {
            console.warn("Bytez Primary (POST) Failed, attempting Fallback...", e);
            try {
                // 2. Fallback
                const fallbackResult = await callOpenRouter(query, messages, PeakModel.FLASH, lang);
                return NextResponse.json(fallbackResult);
            } catch (fallbackError: any) {
                console.error("OpenRouter Function Fallback Failed:", fallbackError);
                return NextResponse.json({
                    detailed_answer: `Error: Both providers failed. Bytez: ${e instanceof Error ? e.message : String(e)}. OpenRouter: ${fallbackError.message}`,
                });
            }
        }

    } catch (error: any) {
        console.error("Request Failed:", error);
        await logErrorToSupabase(error, "POST Request Handler");

        const msg = error instanceof Error ? error.message : String(error);
        let userMessage = msg;

        // Mask technical credit errors with friendly message
        if (msg.includes("401") || msg.includes("402") || msg.includes("429") || msg.includes("insufficient_quota") || msg.includes("billing") || msg.includes("credit") || msg.includes("key")) {
            userMessage = "Our AI is resting. Please come back tomorrow! 🚀";
        }

        return NextResponse.json({
            detailed_answer: `Error: ${userMessage}`,
        });
    }
}
