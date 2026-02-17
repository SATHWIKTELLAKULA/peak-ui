/**
 * Peak AI - Unified LLM Service Layer
 * Handles interactions with OpenRouter API for both OpenAI and Anthropic models.
 * Supports "Dual-Key" routing and unified fallback.
 */

export enum PeakModel {
    CODE = "openai/gpt-5.2-codex",
    PRO = "anthropic/claude-4.6-opus",
    FLASH = "openai/gpt-5.2-pro", // Changed per request: General Chat must use openai/gpt-5.2-pro
    CREATIVE = "openai/gpt-5.2-pro", // Match Flash for text base
    CODEX = "openai/gpt-5.2-codex",
    OPUS = "anthropic/claude-4.6-opus",
    GPT_PRO = "openai/gpt-5.2-pro",
    CLAUDE_FALLBACK = "anthropic/claude-opus-4.5",
    DEFAULT = "openai/gpt-5.2-pro" // Changed default to GPT-5.2 Pro
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

    if (model.startsWith("openai/")) {
        apiKey = process.env.OPENROUTER_KEY_OPENAI || apiKey;
    } else if (model.startsWith("anthropic/")) {
        apiKey = process.env.OPENROUTER_KEY_ANTHROPIC || apiKey;
    }

    if (!apiKey) {
        console.error(`[LLM Service] Error: API Key missing for model ${model}`);
        throw new Error("API key not configured for " + model);
    }

    // 2. Prepare Payload
    // Default to a single user message if only query is provided
    let payloadMessages = messages || [{ role: "user", content: query }];

    // Inject System Prompt for Language
    const systemPrompt = `You are Peak AI. Respond ONLY in English. Use other languages only if explicitly requested.`;

    // Prepend system prompt if not present
    if (!payloadMessages.some((m: any) => m.role === "system")) {
        payloadMessages = [{ role: "system", content: systemPrompt }, ...payloadMessages];
    }

    // 3. Request Configuration
    const controller = new AbortController();
    const timeoutSeconds = model.includes("codex") || model.includes("opus") ? 90 : 60; // Longer timeout for reasoning models
    const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

    try {
        const body: any = {
            model: model,
            messages: payloadMessages,
            max_tokens: config.maxTokens || 4000,
            ...config // Inject effort, thinking, etc.
        };

        console.log(`[LLM Service] Requesting ${model} with timeout ${timeoutSeconds}s...`);

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
            throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "No response received.";

        return {
            detailed_answer: content,
            direct_answer: content.slice(0, 150) + "..."
        };

    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeoutSeconds} seconds`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}
