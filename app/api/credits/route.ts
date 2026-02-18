
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // 1. Fetch OpenRouter Credits
        const openRouterKey = process.env.OPENROUTER_KEY_OPENAI || process.env.OPENROUTER_API_KEY;
        let openRouterStats = { total_credits: 0, total_usage: 0, remaining: 0 };

        if (openRouterKey) {
            try {
                const orRes = await fetch("https://openrouter.ai/api/v1/credits", {
                    headers: {
                        "Authorization": `Bearer ${openRouterKey}`,
                    },
                });

                if (orRes.ok) {
                    const data = await orRes.json();
                    if (data.data) {
                        const total = data.data.total_credits || 0;
                        const usage = data.data.total_usage || 0;
                        openRouterStats = {
                            total_credits: total,
                            total_usage: usage,
                            remaining: total - usage
                        };
                    }
                }
            } catch (e) {
                console.error("Failed to fetch OpenRouter credits:", e);
            }
        }

        // 2. Fetch Kling Usage (Daily Reset)
        let klingStats = { total: 66, used: 0, remaining: 66 };

        if (supabase) {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

            try {
                // Try to get today's usage row
                const { data, error } = await supabase
                    .from("system_stats")
                    .select("kling_usage")
                    .eq("date", today)
                    .single();

                if (data) {
                    klingStats.used = data.kling_usage || 0;
                    klingStats.remaining = Math.max(0, 66 - klingStats.used);
                }
            } catch (err) {
                // Ignore single row fetch errors (e.g. no rows yet)
            }
        }

        return NextResponse.json({
            openrouter: openRouterStats,
            kling: klingStats
        });

    } catch (error) {
        console.error("Credits API Error:", error);
        return NextResponse.json({ error: "Failed to fetch credits" }, { status: 500 });
    }
}
