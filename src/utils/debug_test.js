
import { evaluateExpression } from './expressionEngine.js';

// Mock Context
const defaultContext = {
    replies: {
        budget: 500,
        gift_name: "Speaker"
    },
    api_responses: {
        search_products: {
            found: true,
            products: ["A", "B"]
        },
        empty_search: {
            found: false,
            products: []
        }
    }
};

const testCases = [
    { expr: "true", expected: true },
    { expr: "false", expected: false },
    { expr: "api_responses.search_products.found", expected: true },
    { expr: "api_responses.empty_search.found", expected: false },
    { expr: "api_responses.search_products.found == true", expected: true },
    { expr: "${api_responses.search_products.found}", expected: true },
    { expr: "replies.budget > 100", expected: true },
    { expr: "replies.budget < 100", expected: false },
    { expr: "replies.gift_name", expected: "Speaker" },
    // Logical AND/OR
    { expr: "api_responses.search_products.found && replies.budget > 100", expected: true },
    { expr: "api_responses.empty_search.found || replies.budget > 100", expected: true },
    // Complex paths
    { expr: "api_responses.search_products.products.0", expected: "A" },
    // Built-ins
    { expr: "api_responses.search_products.products?size", expected: 2 },
    { expr: "api_responses.empty_search.products?size", expected: 0 },
    { expr: "api_responses.search_products.products?size > 0", expected: true },
    // Option Evaluation
    { expr: "products", expected: ["Speaker A", "Speaker B"], context: { products: ["Speaker A", "Speaker B"] } },
    { expr: "options", expected: [{ label: "A", value: "a" }], context: { options: [{ label: "A", value: "a" }] } },
    // Granular map tests
    {
        expr: "api_responses.search_results?map(x -> x.name)",
        expected: ["Smartphone X", "Laptop Pro", "Wireless Headphones"],
        context: { api_responses: { search_results: [{ name: "Smartphone X" }, { name: "Laptop Pro" }, { name: "Wireless Headphones" }] } }
    },
    {
        expr: "api_responses.search_results?map(x -> x.name + ' - ' + x.brand)",
        expected: ["Smartphone X - TechBrand", "Laptop Pro - CompWorld", "Wireless Headphones - SoundMax"],
        context: { api_responses: { search_results: [{ name: "Smartphone X", brand: "TechBrand" }, { name: "Laptop Pro", brand: "CompWorld" }, { name: "Wireless Headphones", brand: "SoundMax" }] } }
    },
    // Full Chain with join/split
    {
        expr: "products?join(',')?split(',')",
        expected: ["A", "B"],
        context: { products: ["A", "B"] }
    },
    // Full expression from user (expecting garbage if logic holds, but syntax check)
    // Note: If I implement ?join to use JSON stringify, it might work? let's stick to standard toString first.
    // Standard array join on objects is [object Object].
    {
        expr: "api_responses.search_results?map(x -> { \"v\": x.v })?join(',')?split(',')",
        expected: ["[object Object]", "[object Object]"],
        context: { api_responses: { search_results: [{ v: 1 }, { v: 2 }] } }
    },
    // Complex Map Expression
    {
        expr: "api_responses.search_results?map(x -> { \"value\": x.product_code, \"label\": x.name + ' - ' + x.brand + ' - Model: ' + x.model + ' - Price: $' + x.price?string })",
        expected: [
            { value: "P12345", label: "Smartphone X - TechBrand - Model: X100 - Price: $799.99" },
            { value: "P67890", label: "Laptop Pro - CompWorld - Model: L9000 - Price: $1299.5" },
            { value: "P54321", label: "Wireless Headphones - SoundMax - Model: WH500 - Price: $199.99" }
        ],
        context: {
            api_responses: {
                search_results: [
                    { product_code: "P12345", name: "Smartphone X", brand: "TechBrand", model: "X100", price: 799.99 },
                    { product_code: "P67890", name: "Laptop Pro", brand: "CompWorld", model: "L9000", price: 1299.5 },
                    { product_code: "P54321", name: "Wireless Headphones", brand: "SoundMax", model: "WH500", price: 199.99 }
                ]
            }
        }
    }
];

console.log("Running Expression Engine Tests...");

testCases.forEach((tc, i) => {
    const ctx = tc.context || defaultContext;
    const result = evaluateExpression(tc.expr, ctx);
    // basic equality check (JSON stringify for objects/arrays)
    const passed = JSON.stringify(result) === JSON.stringify(tc.expected);
    if (passed) {
        console.log(`PASSED Test ${i}: "${tc.expr}" -> ${JSON.stringify(result)}`);
    } else {
        console.error(`FAILED Test ${i}: "${tc.expr}"\n  Expected: ${JSON.stringify(tc.expected)}\n  Got:      ${JSON.stringify(result)}`);
    }
});
