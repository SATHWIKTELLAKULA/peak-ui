/**
 * Peak AI - Unified LLM Service Layer
 * Handles interactions with OpenRouter API for both OpenAI and Anthropic models.
 * Supports "Dual-Key" routing and unified fallback.
 */

export enum PeakModel {
    CODE = "google/gemma-3-27b-it:free",
    PRO = "google/gemma-3-27b-it:free",
    FLASH = "google/gemma-3-27b-it:free",
    THINK = "google/gemma-3-27b-it:free",
    CREATIVE = "google/gemma-3-27b-it:free",
    DEFAULT = "google/gemma-3-27b-it:free"
}

export interface LLMConfig {
    effort?: "low" | "medium" | "high" | "max";
    thinking?: { type: "adaptive" | "deep" };
    maxTokens?: number;
    provider?: { require_parameters?: boolean };
}

export async function callOpenRouter(
    query: string,
    messages?: any[],
    model: string = PeakModel.DEFAULT,
    lang: string = "en",
    config: LLMConfig = {}
) {
    // 1. Dynamic Authentication
    let apiKey = process.env.OPENROUTER_API_KEY;

    // Prefer specific keys if available and matching provider
    if (model.startsWith("openai/") && process.env.OPENROUTER_KEY_OPENAI) {
        apiKey = process.env.OPENROUTER_KEY_OPENAI;
    } else if (model.startsWith("anthropic/") && process.env.OPENROUTER_KEY_ANTHROPIC) {
        apiKey = process.env.OPENROUTER_KEY_ANTHROPIC;
    }

    if (!apiKey) {
        throw new Error("Missing OpenRouter Key for model: " + model);
    }

    // 2. Prepare Payload
    // Default to a single user message if only query is provided
    let payloadMessages = messages || [{ role: "user", content: query }];

    // Inject System Prompt for Language
    // STRICT REQUIREMENT: Default to English. Concise as requested.
    const systemPrompt = `You are Peak AI. Analyze text/images. Respond in English only.`;

    // Prepend system prompt if not present
    if (!payloadMessages.some((m: any) => m.role === "system")) {
        payloadMessages = [{ role: "system", content: systemPrompt }, ...payloadMessages];
    }

    // 3. Request Configuration
    // Helper to perform fetch with specific model
    const performFetch = async (targetModel: string) => {
        const controller = new AbortController();
        const timeoutSeconds = 60;
        const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

        try {
            const body: any = {
                model: targetModel,
                messages: payloadMessages,
                max_tokens: config.maxTokens || 1000,
                ...config
            };

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://peak-neural-engine.netlify.app",
                    "X-Title": "Peak AI",
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            if (!response.ok) {
                const errorText = await response.text();
                // Handle Credit Limit / Quota Errors (402 Payment Required or related)
                if (response.status === 402 || errorText.toLowerCase().includes("credit") || errorText.toLowerCase().includes("quota") || errorText.toLowerCase().includes("insufficient")) {
                    throw new Error("Our AI is resting. Please come back tomorrow! 🚀");
                }
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
    };

    try {
        // Attempt Primary Model
        return await performFetch(model);
    } catch (error: any) {
        console.warn(`Primary model (${model}) failed. Attempting fallback...`, error.message);

        // If the error is a definitive "Credit Limit" error from OpenRouter, strictly speaking we might fail everywhere, 
        // but "free" models shouldn't hit credit limits unless rate limited. 
        // We will try fallback for generic errors or even rate limits.

        try {
            const fallbackModel = "meta-llama/llama-3.1-8b-instruct:free";
            return await performFetch(fallbackModel);
        } catch (fallbackError: any) {
            console.error("Fallback model also failed.", fallbackError.message);
            // Return original error to helpful debugging or friendly message
            throw error;
        }
    }
}
