import Bytez from "bytez.js";

if (!process.env.BYTEZ_KEY) {
    console.warn("BYTEZ_KEY is not defined in environment variables.");
}

export const bytez = new Bytez(process.env.BYTEZ_KEY || "");
