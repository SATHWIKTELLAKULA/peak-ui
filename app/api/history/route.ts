import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/** POST — save a search to history */
export async function POST(request: NextRequest) {
    if (!supabase) {
        return NextResponse.json(
            { error: "Supabase is not configured." },
            { status: 503 }
        );
    }

    try {
        const body = await request.json();
        const { query, answer } = body;

        if (!query || !answer) {
            return NextResponse.json(
                { error: "Both 'query' and 'answer' are required." },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from("search_history")
            .insert({ query: query.trim(), answer });

        if (error) {
            console.error("Supabase insert error:", error);
            return NextResponse.json(
                { error: "Failed to save search history." },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json(
            { error: "Invalid request body." },
            { status: 400 }
        );
    }
}

/** GET — fetch the last N searches */
export async function GET(request: NextRequest) {
    if (!supabase) {
        return NextResponse.json({ history: [] });
    }

    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "5", 10);

    const { data, error } = await supabase
        .from("search_history")
        .select("id, query, answer, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Supabase fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch search history." },
            { status: 500 }
        );
    }

    return NextResponse.json({ history: data });
}
