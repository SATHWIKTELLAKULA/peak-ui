import { NextRequest, NextResponse } from "next/server";
import { bytez } from "@/lib/bytez";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// --- Helper: OpenRouter Fallback (Existing Logic) ---
async function callOpenRouter(query: string, messages?: any[], model: string = "openai/gpt-3.5-turbo", lang: string = "en") {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error("Error: OPENROUTER_API_KEY is not set");
        throw new Error("API key not configured");
    }

    // Default to a single user message if only query is provided
    let payloadMessages = messages || [{ role: "user", content: query }];

    // Inject System Prompt for Language
    const systemPrompt = `MANDATORY: The user selected ${lang}. You MUST respond ONLY in the native script of ${lang}. For Telugu, use ONLY Telugu script (తెలుగు లిపి). Ignore all other scripts.`;

    // Prepend system prompt if not present
    if (!payloadMessages.some((m: any) => m.role === "system")) {
        payloadMessages = [{ role: "system", content: systemPrompt }, ...payloadMessages];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://peak-neural-engine.netlify.app",
                "X-Title": "Peak AI",
            },
            body: JSON.stringify({
                model: model,
                messages: payloadMessages,
                max_tokens: 1000,
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "No response received.";

        return {
            detailed_answer: content,
            direct_answer: content.slice(0, 150) + "..."
        };
    } finally {
        clearTimeout(timeoutId);
    }
}

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
                max_results: 5
            })
        });

        if (!response.ok) return null;

        const data = await response.json();
        const context = data.results.map((r: any) => `[${r.title}](${r.url}): ${r.content}`).join("\n");
        return context;
    } catch (e) {
        console.error("Tavily Search Failed:", e);
        return null;
    }
}

// --- Helper: Bytez Primary ---
async function callBytez(query: string, mode: string = "chat", messages?: any[], quality: string = "standard", lang: string = "en") {
    // 1. Smart Trigger: Check for "free" or "fast" keywords in Image/Video mode
    const lowerQuery = query.toLowerCase();
    const isImageMode = mode === "image" || mode === "visualize";
    const isVideoMode = mode === "video";

    if (isImageMode && (lowerQuery.includes("free") || lowerQuery.includes("fast") || lowerQuery.includes("pollinations"))) {
        console.log("[Smart Trigger] Switching to Pollinations.ai (Image)");
        return callPollinationsImage(query);
    }

    if (isVideoMode) {
        console.log("[Director Mode] Switching to Pollinations.ai (Video)");
        return callPollinationsVideo(query);
    }

    // Pro Mode / Analyze Mode -> Fetch Context via Tavily
    let searchContext = "";
    if (mode === "pro" || mode === "analyze") {
        console.log(`[${mode} Mode] Fetching real-time data via Tavily...`);
        const tavilyData = await callTavily(query);
        if (tavilyData) {
            searchContext = `\n\n[REAL-TIME SEARCH CONTEXT]:\n${tavilyData}\n\nUse this context to answer the user's question accurately.`;
        }
    }

    // STRICT Language Instruction
    const languageInstruction = `MANDATORY: The user selected ${lang}. You MUST respond ONLY in the native script of ${lang}. For Telugu, use ONLY Telugu script (తెలుగు లిపి). Ignore all other scripts.`;

    // Pro Mode -> Kimi K2 (via OpenRouter)
    if (mode === "pro" || mode === "analyze") { // Analyze also routes to Kimi for reasoning
        console.log(`[${mode} Mode] Switching to SOTA Model (Kimi K2) via OpenRouter`);
        try {
            // Append context to query/messages for OpenRouter
            // We pass lang to callOpenRouter but we can also inject context here
            const enrichedQuery = query + searchContext;

            // Note: callOpenRouter handles the system prompt injection internally, 
            // but we might want to update it to accept context or just pass enriched query
            // Let's modify callOpenRouter's signature or usage slightly? 
            // Actually, we can just pass the enriched query.

            return await callOpenRouter(enrichedQuery, messages, "moonshotai/kimi-k2:free", lang);
        } catch (error) {
            console.error(`[${mode} Mode] Model Failed:`, error);
            return {
                detailed_answer: "Kimi is connecting... (The model is currently unreachable, please try again in a moment.)",
                direct_answer: "Kimi is connecting..."
            };
        }
    }

    // Select model based on mode
    let modelId = "meta-llama/Llama-3-8b-chat-hf"; // Default Chat 

    switch (mode) {
        case "vision":
            modelId = "llava-hf/llava-1.5-7b-hf";
            break;
        case "image":
            modelId = "stabilityai/stable-diffusion-xl-base-1.0";
            break;
        case "audio":
            modelId = "suno/bark";
            break;
        case "chat":
        default:
            modelId = "meta-llama/Llama-3-8b-chat-hf"; // Fallback to a solid chat model
            break;
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

    if (mode === "chat" && messages && messages.length > 0) {
        // If it's a chat model, it might expect a conversation history.
        // If Bytez client handles it, great. If not, we might need to stringify.
        // We will try passing the messages array directly first.
        input = messages;
    }

    // Additional Logic for Language injection if Bytez supports system prompt via input or if we need to prepend to query/messages
    const systemPrompt = `You are Peak AI. The user has explicitly selected ${lang}. You MUST ignore all other languages and respond ONLY in the native script of ${lang}. If Telugu is selected, respond ONLY in Telugu script (తెలుగు లిపి). If Hindi is selected, use Devanagari script.`;



    if (mode === "chat" && !isImageMode) {
        if (Array.isArray(input)) {
            if (!input.some((m: any) => m.role === "system")) {
                input = [{ role: "system", content: systemPrompt }, ...input];
            }
        } else if (typeof input === "string") {
            // For simple string query, prepend the instruction
            input = `${systemPrompt}\n\nUser: ${input}`;
        }
    }

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
            // 2. Fallback to OpenRouter
            const fallbackResult = await callOpenRouter(query, undefined, undefined, lang);
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
                const fallbackResult = await callOpenRouter(query, messages, undefined, lang);
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
