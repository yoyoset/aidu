import { JsonCleaner } from '../src/background/llm/utils/json_cleaner.js';

// Test cases
const cases = [
    {
        name: "Simple missing comma",
        input: `{ "a": 1 "b": 2 }`,
        expected: `{ "a": 1, "b": 2 }`
    },
    {
        name: "Missing comma after string",
        input: `{ "a": "hello" "b": "world" }`,
        expected: `{ "a": "hello", "b": "world" }`
    },
    {
        name: "Missing comma after array/object",
        input: `{ "a": [] "b": {} "c": 3 }`,
        expected: `{ "a": [], "b": {}, "c": 3 }`
    },
    {
        name: "Quote inside string (should not trigger)",
        input: `{ "a": "hello \\" world" "b": 2 }`,
        expected: `{ "a": "hello \\" world", "b": 2 }`
    },
    {
        name: "Real world example from screenshot",
        input: `{ "sentences": [ { "original_text": "He'd been telling people about it, telling people about it at great length, he rather suspected: his clearest visual recollection was of glazed looks on other people's faces.", "translation": "他一直在跟人们讲这件事，长篇大论地讲，他颇为怀疑：他最清晰的视觉回忆是别人脸上呆滞的表情。 ", "segments": []}}`,
        expected: `{ "sentences": [ { "original_text": "...", "translation": "...", "segments": []}]}`
    },
    {
        name: "Missing comma and trailing closure mismatch combo",
        input: `{
    "sentences": [
        {
            "original_text": "He broke it up."
            "translation": "他把它拆散了。"
            "segments": []
        }}`,
        expected: `{
    "sentences": [
        {
            "original_text": "He broke it up.",
            "translation": "他把它拆散了。",
            "segments": []
        }]}`
    }
];

for (const tc of cases) {
    const output = JsonCleaner.clean(tc.input);
    console.log(`--- Test: ${tc.name} ---`);
    console.log("Input:", JSON.stringify(tc.input));
    console.log("Output:", JSON.stringify(output));
    try {
        JSON.parse(output);
        console.log("Status: VALID JSON");
    } catch (e) {
        console.log("Status: INVALID JSON -", e.message);
    }
}

