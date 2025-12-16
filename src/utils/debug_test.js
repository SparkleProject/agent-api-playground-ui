
import { evaluateExpression } from './expressionEngine.js';

const context = {
    replies: {
        speaker_model: "Sonos",
        budget: 500
    },
    api_responses: {
        search_products: {
            status: "success",
            found: true,
            products: ["A", "B"]
        },
        empty_search: {
            status: "success",
            found: false,
            products: []
        }
    },
    now: new Date()
};

const tests = [
    { expr: "true", expected: true },
    { expr: "false", expected: false },
    { expr: "api_responses.search_products.found", expected: true },
    { expr: "api_responses.empty_search.found", expected: false },
    { expr: "api_responses.search_products.found == true", expected: true },
    { expr: "api_responses.empty_search.found == false", expected: true },
    { expr: "api_responses.empty_search.found == true", expected: false },
    { expr: "${api_responses.search_products.found}", expected: true },
    { expr: "replies.budget > 100", expected: true },
    { expr: "replies.budget < 100", expected: false },
    // Logical AND/OR
    { expr: "api_responses.search_products.found && replies.budget > 100", expected: true },
    { expr: "api_responses.empty_search.found || replies.budget > 100", expected: true },
    // Complex paths
    { expr: "api_responses.search_products.products.0", expected: "A" },
    // Built-ins
    { expr: "api_responses.search_products.products?size", expected: 2 },
    { expr: "api_responses.empty_search.products?size", expected: 0 },
    { expr: "api_responses.search_products.products?size > 0", expected: true }
];

console.log("Running Expression Engine Tests...");
let failed = 0;

tests.forEach((t, i) => {
    const result = evaluateExpression(t.expr, context);
    if (result !== t.expected) {
        console.error(`FAILED Test ${i}: "${t.expr}"`);
        console.error(`  Expected: ${t.expected}`);
        console.error(`  Got:      ${result}`);
        failed++;
    } else {
        console.log(`PASSED Test ${i}: "${t.expr}" -> ${result}`);
    }
});

if (failed === 0) {
    console.log("All tests passed!");
} else {
    console.log(`${failed} tests failed.`);
}
