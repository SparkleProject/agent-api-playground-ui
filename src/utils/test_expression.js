
import { evaluateExpression } from './expressionEngine.js';

const context = {
    replies: {
        age: 20,
        name: 'John',
        isStudent: true
    },
    api_responses: {
        search: [{ id: 1, name: "Item 1" }]
    },
    now: new Date() // Mock
};

const tests = [
    { expr: "${replies.age > 18}", expected: true },
    { expr: "${replies.age < 18}", expected: false },
    { expr: "${replies.name == 'John'}", expected: true },
    { expr: "${replies.name != 'Jane'}", expected: true },
    { expr: "${replies.isStudent && replies.age >= 20}", expected: true },
    { expr: "${replies.age > 30 || replies.isStudent}", expected: true },
    { expr: "${!replies.isStudent}", expected: false },
    { expr: "${replies.missingField??}", expected: false },
    { expr: "${replies.name??}", expected: true },
    { expr: "${replies.age > 18 ?then('Adult', 'Minor')}", expected: 'Adult' },
    { expr: "${replies.age < 18 ?then('Adult', 'Minor')}", expected: 'Minor' },
    { expr: "${api_responses.search.0.name}", expected: "Item 1" },
    { expr: "true", expected: true },
    { expr: "100", expected: 100 },
];

console.log("Running Expression Engine Tests...");
let passed = 0;
tests.forEach((t, i) => {
    const result = evaluateExpression(t.expr, context);
    if (result === t.expected) {
        passed++;
    } else {
        console.error(`Test ${i + 1} Failed: "${t.expr}"`);
        console.error(`   Expected: ${t.expected}`);
        console.error(`   Got: ${result}`);
    }
});

console.log(`\nTests Completed: ${passed}/${tests.length} passed.`);
if (passed === tests.length) {
    console.log("✅ All logic Verified.");
} else {
    console.log("❌ Some tests failed.");
}
