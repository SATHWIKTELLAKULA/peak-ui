const puter = require('@heyputer/puter.js');

async function test() {
    try {
        console.log("Testing Puter AI...");
        const response = await puter.ai.chat("Hello");
        console.log("Response:", response);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

test();
