import { NextRequest, NextResponse } from "next/server";
import { bytez } from "@/lib/bytez";
import { callOpenRouter, PeakModel } from "@/lib/openrouter";

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

// --- Helper: Hugging Face Image Generation (FLUX) ---
async function callHuggingFaceImage(query: string) {
    const token = process.env.HUGGINGFACE_TOKEN;
    if (!token) {
        console.warn("HUGGINGFACE_TOKEN missing. Skipping HF generation.");
        return null;
    }

    try {
        console.log(`[Hugging Face] Generating image with FLUX.1-schnell for: "${query}"`);
        const response = await fetch(
            "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "x-use-cache": "false"
                },
                body: JSON.stringify({ inputs: query }),
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

// --- Helper: Bytez Primary ---
async function callBytez(query: string, mode: string = "chat", messages?: any[], quality: string = "standard", lang: string = "en") {
    // 1. Smart Trigger: Check for "free" or "fast" keywords in Image/Video mode
    const lowerQuery = query.toLowerCase();
    const isImageMode = mode === "image" || mode === "visualize";
    const isVideoMode = mode === "video";

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

    if (isVideoMode) {
        console.log("[Director Mode] Switching to Pollinations.ai (Video)");
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

    // --- ROUTING LOGIC: DUAL-MODEL STRATEGY ---

    // 1. CODE MODE (Priority 1)
    if (mode === "code") {
        console.log("[Code Mode] Engaged. Routing to Primary: GPT-5.2 Codex");

        try {
            // Primary: GPT-5.2 Codex with Max Effort
            return await callOpenRouter(query, messages, PeakModel.CODE, lang, { effort: "max" });
        } catch (primaryError) {
            console.warn("[Code Mode] Primary Failed, engaging Reviewer/Fallback (Claude Opus)...");
            try {
                // Reviewer/Fallback: Claude Opus 4.6
                return await callOpenRouter(query, messages, PeakModel.PRO, lang, { thinking: { type: "adaptive" } });
            } catch (fallbackError) {
                throw new Error(`Code Mode Failed. Primary: ${primaryError}, Fallback: ${fallbackError}`);
            }
        }
    }

    // 2. PRO / ANALYZE MODE (Priority 1)
    // Pro Mode / Analyze Mode -> Fetch Context via Tavily
    let searchContext = "";
    if (mode === "pro" || mode === "analyze") {
        console.log(`[${mode} Mode] Fetching real-time data via Tavily...`);
        const tavilyData = await callTavily(query);
        if (tavilyData) {
            searchContext = `\n\n[REAL-TIME SEARCH CONTEXT]:\n${tavilyData}\n\nUse this context to answer the user's question accurately.`;
        }

        // Logic for Pro/Analyze using Claude Opus 4.6 (Premium Reasoning)
        console.log(`[${mode} Mode] Routing to Primary: Claude Opus 4.6`);
        try {
            const enrichedQuery = query + searchContext;
            return await callOpenRouter(enrichedQuery, messages, PeakModel.PRO, lang, { thinking: { type: "adaptive" } });
        } catch (primaryError) {
            console.warn(`[${mode} Mode] Primary Failed, engaging Fallback (GPT-5.2 Codex)...`);
            const enrichedQuery = query + searchContext;
            return await callOpenRouter(enrichedQuery, messages, PeakModel.CODE, lang);
        }
    }

    // Select model for other modes (standard chat fallback, audio, etc)
    let modelId = "meta-llama/Llama-3-8b-chat-hf"; // Default Chat 

    switch (mode) {
        case "vision":
            modelId = "llava-hf/llava-1.5-7b-hf";
            break;
        case "visualize":
        case "image":
            modelId = "stabilityai/stable-diffusion-xl-base-1.0";
            break;
        case "audio":
            modelId = "suno/bark";
            break;
        case "chat": // Flash Mode
        case "creative": // Creative Mode Text
        default:
            // Standard Chat (Flash) routes to GPT-4o-mini (Cost Effective)
            console.log(`[${mode} Mode] Routing to Primary: GPT-4o-mini`);
            try {
                return await callOpenRouter(query, messages, PeakModel.FLASH, lang);
            } catch (e) {
                console.warn(`[${mode} Mode] Primary Failed, enabling Fallback (GPT-3.5)`);
                return await callOpenRouter(query, messages, PeakModel.DEFAULT, lang);
            }
    }

    console.log(`[Bytez] Using model: ${modelId} for mode: ${mode}`);

    const model = bytez.model(modelId);


    // Construct input
    // For Chat/Vision, usually passes the messages array or the last query
    // If messages are present, use them. Otherwise use query.
    // Bytez 'run' inputs depend on the model. 
    // For safety with Llama-3-8b-chat-hf via Bytez, we try passing the query string or the full messages.
    // Documentation isn't explicit on "chat-model" formatting for "run", so we'll try passing the raw query 
    // for simple cases, and the messages array if provided.

    let input: any = query;

    // --- Auto-Enhance for Anime in Visualize Mode ---
    if ((mode === "image" || mode === "visualize") && (input.toLowerCase().includes("anime") || input.toLowerCase().includes("manga"))) {
        console.log("[Visualize] Detected Anime intent. Fetching style reference...");
        const styleRef = await fetchAnimeStyleReference();
        if (styleRef) {
            const enhanced = await enhanceAnimePrompt(input, styleRef);
            console.log(`[Visualize] Enhanced Prompt: ${enhanced}`);
            input = enhanced;
        }
    }

    // Chat mode handled by OpenRouter above, so input setup for Bytez chat is skipped

    // ADDITIONAL STRICT Language Instruction for Bytez/OpenRouter
    // Simplified Language Instruction
    const systemPrompt = `You are Peak AI. Respond primarily in English. Only answer in another language if the user explicitly requests it.`;

    // System prompt injection for Bytez handled here if needed (e.g. for vision?)
    // But since chat mode uses OpenRouter directly, this block is unreachable for chat.
    // Kept for structure if logic changes.

    const response = await model.run(input);

    if (response.error) {
        throw new Error(`Bytez Error: ${response.error}`);
    }

    const output = response.output;

    // Parse Output
    // Output format depends on model. Text models usually return a string or an object with 'generated_text'.
    // Image models return base64 or URL.

    let content = "";

    if (mode === "image") {
        // Handle Image Output
        if (Buffer.isBuffer(output)) {
            const base64 = output.toString('base64');
            content = `IMAGE_DATA:data:image/png;base64,${base64}`;
        } else if (typeof output === "object" && output !== null) {
            // Check for specific Bytez image response structure if it's not a direct buffer
            // Using 'any' cast to safely check properties
            const out: any = output;
            if (out.image && typeof out.image === 'string') {
                // base64 or url
                content = `IMAGE_DATA:${out.image}`;
            } else if (out instanceof ArrayBuffer) {
                const buffer = Buffer.from(out);
                const base64 = buffer.toString('base64');
                content = `IMAGE_DATA:data:image/png;base64,${base64}`;
            } else {
                // Fallback: try to json stringify to debug or maybe it contains a url
                content = JSON.stringify(output);
            }
        } else if (typeof output === "string") {
            // Might be a URL or raw base64
            if (output.startsWith("http") || output.startsWith("data:")) {
                content = `IMAGE_DATA:${output}`;
            } else {
                // Assume it might be raw base64 if it's a long string without spaces
                content = `IMAGE_DATA:data:image/png;base64,${output}`;
            }
        }
    } else {
        // Text / Chat Handling
        if (typeof output === "string") {
            content = output;
        } else if (typeof output === "object") {
            // Handle common structures
            if (output.generated_text) content = output.generated_text;
            else if (output.text) content = output.text;
            else if (Array.isArray(output) && output[0]?.generated_text) content = output[0].generated_text;
            else content = JSON.stringify(output); // Fallback
        } else {
            content = String(output);
        }
    }

    return {
        detailed_answer: content,
        direct_answer: mode === "image" ? "Generating Visualization..." : (content.slice(0, 150) + "...")
    };
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
        // 1. Try Bytez
        const result = await callBytez(query, mode, undefined, quality, lang);
        return NextResponse.json(result);
    } catch (e) {
        console.warn("Bytez Primary Failed, attempting Fallback...", e);
        try {
            // 2. Fallback to OpenRouter (General Chat)
            const fallbackResult = await callOpenRouter(query, undefined, PeakModel.FLASH, lang);
            return NextResponse.json(fallbackResult);
        } catch (fallbackError: any) {
            console.error("OpenRouter Fallback Failed:", fallbackError);
            return NextResponse.json({
                detailed_answer: `Error: Both providers failed. Bytez: ${e instanceof Error ? e.message : String(e)}. OpenRouter: ${fallbackError.message}`,
            });
        }
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { messages, quality = "standard", lang = "en" } = body;
        let { mode = "chat" } = body;

        let query = "";
        if (messages && Array.isArray(messages) && messages.length > 0) {
            query = messages[messages.length - 1].content;
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

    } catch (error) {
        console.error("Request Failed:", error);
        return NextResponse.json({
            detailed_answer: `Error: ${error instanceof Error ? error.message : String(error)}`,
        });
    }
}
