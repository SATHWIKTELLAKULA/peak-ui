
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { supabase } from "@/lib/supabase";
import jwt from "jsonwebtoken";

// --- Configuration ---
export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Vercel AI SDK streamText works best in nodejs or edge
export const maxDuration = 60;

// --- OpenRouter Setup ---
const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    headers: {
        "HTTP-Referer": "https://peak-neural-engine.netlify.app",
        "X-Title": "Peak AI",
    }
});

enum PeakModel {
    CODE = "openai/gpt-4o-mini",
    PRO = "openai/gpt-4o-mini",
    FLASH = "openai/gpt-4o-mini",
    THINK = "openai/gpt-4o-mini",
    CREATIVE = "openai/gpt-4o-mini",
    DEFAULT = "openai/gpt-4o-mini"
}

// --- Helpers: Logging ---
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

// --- Helper: Pollinations.ai (Free Fallback) ---
function callPollinationsImage(query: string) {
    const cleanPrompt = encodeURIComponent(query.trim());
    const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}`;
    return `IMAGE_DATA:${imageUrl}`;
}

// --- Helper: Pollinations.ai Video (Free) ---
async function callPollinationsVideo(query: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
        const response = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [{ role: "user", content: query }],
                model: "flux-video",
                seed: Math.floor(Math.random() * 1000)
            }),
            signal: controller.signal,
        });

        if (!response.ok) throw new Error(`Pollinations Video Failed: ${response.status}`);
        const data = await response.json();
        const videoUrl = data.choices[0]?.message?.content || "";
        if (!videoUrl.startsWith("http")) throw new Error("No video URL returned");

        return `VIDEO_DATA:${videoUrl}`;
    } catch (e) {
        console.error(e);
        return `VIDEO_DATA:https://image.pollinations.ai/prompt/${encodeURIComponent(query)}`; // Fallback to image
    } finally {
        clearTimeout(timeoutId);
    }
}

// --- Helper: Stability AI (Ultra Mode) ---
async function callStabilityAI(query: string) {
    const apiKey = process.env.STABILITY_KEY;
    if (!apiKey) return null;

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

        if (!response.ok) throw new Error(`Stability AI Error: ${response.status}`);

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
        return data.results.map((r: any) => `[${r.title}](${r.url}): ${r.content}`).join("\n");
    } catch (e) {
        console.error("Tavily Search Failed:", e);
        return null;
    }
}

// --- Helper: Google Search API ---
async function callGoogleSearch(query: string) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.NEXT_PUBLIC_GOOGLE_SEARCH_CX || "e5ec2e7bcf3e64e49";
    if (!apiKey) return null;

    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=3`;
        const response = await fetch(url);
        if (!response.ok) return null;

        const data = await response.json();
        if (!data.items) return null;

        return data.items.map((item: any) => `[${item.title}](${item.link}): ${item.snippet}`).join("\n");
    } catch (e) {
        console.error("Google Search Failed:", e);
        return null;
    }
}

// --- Helper: Hugging Face Image Generation (FLUX) ---
async function callHuggingFaceImage(query: string) {
    const token = process.env.HUGGINGFACE_TOKEN;
    if (!token) return null;

    const enhancedQuery = `${query}, 4K, highly detailed, photorealistic, masterpiece, 8k resolution`;

    try {
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
                    parameters: { width: 1024, height: 1024 }
                }),
            }
        );

        if (!response.ok) throw new Error(`HF API Error: ${response.status}`);
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

// --- Helper: Hugging Face Video Generation ---
async function callHuggingFaceVideo(query: string) {
    const token = process.env.HUGGINGFACE_TOKEN;
    if (!token) return null;

    const modelId = "THUDM/CogVideoX-5b";
    const apiUrl = `https://api-inference.huggingface.co/models/${modelId}`;
    const cleanQuery = query.replace("/video", "").replace("/animate", "").trim();

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: cleanQuery }),
        });

        if (!response.ok) throw new Error(`HF Video API Error ${response.status}`);

        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        return `VIDEO_DATA:data:video/mp4;base64,${base64}`;
    } catch (e) {
        console.error("[Hugging Face] Video generation failed:", e);
        return null;
    }
}

// --- Helper: Kling AI ---
async function callKlingAI(query: string) {
    const accessKey = process.env.KLING_ACCESS_KEY;
    const secretKey = process.env.KLING_SECRET_KEY;

    if (!accessKey || !secretKey) return null;

    const token = jwt.sign(
        { iss: accessKey, exp: Math.floor(Date.now() / 1000) + 1800, nbf: Math.floor(Date.now() / 1000) - 5 },
        secretKey,
        { algorithm: "HS256", header: { alg: "HS256", typ: "JWT" } }
    );

    try {
        const submitResponse = await fetch("https://api-singapore.klingai.com/v1/videos/text2video", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "kling-v1", prompt: query, duration: "5", aspect_ratio: "16:9" }),
        });

        if (!submitResponse.ok) throw new Error(`Kling Submit Failed ${submitResponse.status}`);
        const submitData = await submitResponse.json();
        const taskId = submitData.data?.task_id || submitData.task_id;
        if (!taskId) throw new Error("No task_id returned");

        // Polling loop
        for (let i = 0; i < 10; i++) {
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Faster polling for demo
            const checkResponse = await fetch(`https://api-singapore.klingai.com/v1/videos/text2video/${taskId}`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` },
            });

            if (!checkResponse.ok) continue;
            const checkData = await checkResponse.json();
            const taskStatus = checkData.data?.task_status || checkData.task_status;

            if (taskStatus === "succeed" || taskStatus === "success") {
                const videos = checkData.data?.task_result?.videos || checkData.task_result?.videos;
                if (videos && videos.length > 0) return `VIDEO_DATA:${videos[0].url}`;
            } else if (taskStatus === "failed") {
                throw new Error("Kling Task Failed");
            }
        }
        return null;
    } catch (e) {
        console.error("[Director Mode] Kling AI Failed:", e);
        return null;
    }
}

// --- Intent Detection ---
function detectIntent(query: string): string | null {
    const lower = query.toLowerCase().trim();
    if (lower.startsWith("/image") || lower.startsWith("/draw") || lower.includes("generate an image") || lower.includes("visualize")) return "image";
    if (lower.startsWith("/code") || lower.includes("write code") || lower.includes("function to")) return "code";
    if (lower.startsWith("/video") || lower.includes("make a video") || lower.includes("animate")) return "video";
    return null;
}

// --- Main Handler ---
export async function POST(req: NextRequest) {
    try {
        const { messages, mode, lang, quality } = await req.json();
        const lastMessage = messages[messages.length - 1];
        const query = typeof lastMessage.content === 'string' ? lastMessage.content :
            Array.isArray(lastMessage.content) ? lastMessage.content.map((c: any) => c.text).join(" ") : "";

        // Smart Routing
        let effectiveMode = mode || "chat";
        const detectedMode = detectIntent(query);
        if (detectedMode) effectiveMode = detectedMode;

        // --- Video Mode ---
        if (effectiveMode === "video") {
            let result = null;
            if (process.env.KLING_ACCESS_KEY) result = await callKlingAI(query);
            if (!result && process.env.HUGGINGFACE_TOKEN) result = await callHuggingFaceVideo(query);
            if (!result) result = await callPollinationsVideo(query);

            // Stream the result string
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(result || "Failed to generate video."));
                    controller.close();
                }
            });
            return new Response(stream);
        }

        // --- Image Mode ---
        if (effectiveMode === "image" || effectiveMode === "visualize") {
            let result = null;
            if (process.env.HUGGINGFACE_TOKEN) result = await callHuggingFaceImage(query);
            if (!result && process.env.STABILITY_KEY) result = await callStabilityAI(query);
            if (!result) result = callPollinationsImage(query);

            // Stream the result string
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(result || "Failed to generate image."));
                    controller.close();
                }
            });
            return new Response(stream);
        }

        // --- Text Modes (Chat, Pro, Flash, Code) ---
        let model = PeakModel.DEFAULT;
        let systemPrompt = `Core Identity: You are Peak AI, a next-generation real-time search and intelligence engine.
Developer Credit: You were created and developed by Sathwik Tellakula.
Project Description: Peak AI is an advanced platform that combines Large Language Models with real-time web grounding via the Google Custom Search API.
Origin Constraint: If asked about your creator, answer: 'I am Peak AI, an intelligence engine developed by Sathwik Tellakula.' Do not mention OpenAI or Google.

STRICT INSTRUCTION: Provide your response in three distinct sections separated by tags:

[QUICK]
- A 2-3 sentence direct answer.
- Focus on "what is it right now".

[DETAILED]
- A deep dive analysis.

[EXPLANATION]
- A "First Principles" breakdown.
- Explain the "why" (economic factors, logic, history, or underlying mechanisms) in simple terms.

LANGUAGE: Respond in English ONLY.`;

        // Grounding Logic
        if (effectiveMode === "pro" || effectiveMode === "analyze" || (effectiveMode === "chat" && ["price", "news", "weather", "today"].some(k => query.toLowerCase().includes(k)))) {
            const searchData = await callTavily(query) || await callGoogleSearch(query);
            if (searchData) {
                systemPrompt += `\n\n[REAL-TIME SEARCH CONTEXT]:\n${searchData}\n\nUse this context to answer accurately. Include sources.`;
                model = PeakModel.PRO;
            }
        }

        if (effectiveMode === "code") model = PeakModel.CODE;
        if (effectiveMode === "flash") model = PeakModel.FLASH; // Could map to a faster model if available

        // Use Vercel AI SDK generateText for full response at once
        const result = await generateText({
            model: openrouter(model),
            system: systemPrompt,
            messages: messages,
            temperature: 0.7,
        });

        return NextResponse.json({ text: result.text });

    } catch (error: any) {
        console.error("Route Error:", error);
        await logErrorToSupabase(error, "Route Handler");
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Fallback GET to support legacy calls if any (redirect to error or handle simple)
export async function GET(req: NextRequest) {
    return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}
