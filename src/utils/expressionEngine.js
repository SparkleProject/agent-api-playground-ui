
/**
 * Safe Expression Evaluator for Wave Workflows
 * 
 * Supports a subset of Freemarker syntax:
 * - Variables: replies.field_name, api_responses.api_name.field, now
 * - Operators: >, <, >=, <=, ==, !=, &&, ||, !
 * - Built-ins: ?string, ?then(trueVal, falseVal), ?? (exists)
 * - Types: string, number, boolean, date/time
 */

export const evaluateExpression = (expression, context) => {
    if (!expression) return null;
    if (typeof expression !== 'string') return expression;

    // Remove wrapper ${...} if present
    let expr = expression.trim();
    if (expr.startsWith('${') && expr.endsWith('}')) {
        expr = expr.substring(2, expr.length - 1);
    }

    try {
        // Tokenize and parse (simplified approach: logical -> comparison -> values)
        return evalLogical(expr, context);
    } catch (e) {
        console.warn(`Expression evaluation failed: "${expression}"`, e);
        return null;
    }
};

// --- Recursive Descent Parsers ---

// Handle ||
const evalLogical = (expr, context) => {
    const parts = splitByTopLevel(expr, '||');
    if (parts.length > 1) {
        return parts.reduce((acc, part, index) => {
            const val = evalAnd(part, context);
            return index === 0 ? val : (acc || val);
        }, false);
    }
    return evalAnd(expr, context);
};

// Handle &&
const evalAnd = (expr, context) => {
    const parts = splitByTopLevel(expr, '&&');
    if (parts.length > 1) {
        return parts.reduce((acc, part, index) => {
            const val = evalTernary(part, context); // Changed from evalEquality
            return index === 0 ? val : (acc && val);
        }, true);
    }
    return evalTernary(expr, context); // Changed from evalEquality
};

// Handle ?then(true, false) - Ternary Logic
const evalTernary = (expr, context) => {
    // Check if the expression ends with ?then(...)
    // We need to be careful about matching the specific suffix and balancing parens for the args
    if (expr.includes('?then')) {
        // Find the LAST occurrence of ?then to treat it as the suffix for the current expression
        // But we must respect text structure. Using splitByTopLevel isn't suitable for suffix check easily.
        // Let's iterate backwards or regex match the end.

        // Regex to match "anything ?then(args)" at end of string
        // We use a simplified check: does it end with ')' and have '?then(' somewhere?
        const thenIndex = expr.lastIndexOf('?then(');
        if (thenIndex > 0) {
            // Check if this ?then is actually top-level (not wrapped in parens)
            // This is tricky without a full parser, but let's assume valid simple syntax first.
            // Verification: check parenthesis balance of the suffix
            const suffix = expr.substring(thenIndex); // ?then(...)
            if (suffix.endsWith(')')) {
                // Verify parens balance in the args part
                // suffix: ?then(arg1, arg2)
                // content: arg1, arg2
                const content = suffix.substring(6, suffix.length - 1);
                // We need to split args safely
                const args = splitByTopLevel(content, ',');

                if (args.length === 2) {
                    const conditionPart = expr.substring(0, thenIndex).trim();
                    const condition = evalLogical(conditionPart, context); // Recurse to Logical for condition
                    return condition ? evalTernary(args[0], context) : evalTernary(args[1], context);
                }
            }
        }
    }
    return evalEquality(expr, context);
};

// Handle ==, !=
const evalEquality = (expr, context) => {
    if (expr.includes('==')) {
        const [left, right] = splitByTopLevel(expr, '==');
        return evalComparison(left, context) == evalComparison(right, context);
    }
    if (expr.includes('!=')) {
        const [left, right] = splitByTopLevel(expr, '!=');
        return evalComparison(left, context) != evalComparison(right, context);
    }
    return evalComparison(expr, context);
};

// Handle >, <, >=, <=
const evalComparison = (expr, context) => {
    // Check >=, <= first as they contain <, >
    if (expr.includes('>=')) {
        const [left, right] = splitByTopLevel(expr, '>=');
        return evalValue(left, context) >= evalValue(right, context);
    }
    if (expr.includes('<=')) {
        const [left, right] = splitByTopLevel(expr, '<=');
        return evalValue(left, context) <= evalValue(right, context);
    }
    if (expr.includes('>')) {
        const [left, right] = splitByTopLevel(expr, '>');
        return evalValue(left, context) > evalValue(right, context);
    }
    if (expr.includes('<')) {
        const [left, right] = splitByTopLevel(expr, '<');
        return evalValue(left, context) < evalValue(right, context);
    }
    return evalValue(expr, context);
};

// Handle values, variables, built-ins, functions
const evalValue = (rawExpr, context) => {
    let expr = rawExpr.trim();

    // Handle Parentheses
    if (expr.startsWith('(') && expr.endsWith(')')) {
        return evalLogical(expr.substring(1, expr.length - 1), context);
    }

    // Handle Not (!)
    if (expr.startsWith('!')) {
        return !evalValue(expr.substring(1), context);
    }

    // Handle Built-in: ?string
    // Example: zonedDateTime?string
    if (expr.endsWith('?string')) {
        const variable = expr.replace('?string', '').trim();
        const val = resolveVariable(variable, context);
        return val ? String(val) : "";
    }

    // Handle Built-in: ?has_content
    if (expr.endsWith('?has_content')) {
        const variable = expr.replace('?has_content', '').trim();
        const val = resolveVariable(variable, context);
        if (val === null || val === undefined) return false;
        if (typeof val === 'string' || Array.isArray(val)) return val.length > 0;
        if (typeof val === 'object') return Object.keys(val).length > 0;
        return true;
    }

    // Handle Existence: ?? 
    // Example: replies.age??
    if (expr.endsWith('??')) {
        const variable = expr.replace('??', '').trim();
        // Don't simplify 'resolveVariable' returns null/undefined as missing
        const val = resolveVariable(variable, context);
        return val !== null && val !== undefined;
    }

    // Literals
    // String
    if ((expr.startsWith(`"`) && expr.endsWith(`"`)) || (expr.startsWith(`'`) && expr.endsWith(`'`))) {
        return expr.substring(1, expr.length - 1);
    }
    // Number
    if (!isNaN(expr) && expr !== '') {
        return Number(expr);
    }
    // Boolean
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;

    // Fallback: Variable Resolution
    return resolveVariable(expr, context);
};


// --- Helper: Split by delimiter avoiding nested structures ---
const splitByTopLevel = (str, delimiter) => {
    let parts = [];
    let current = '';
    let parenthesisLevel = 0;
    let quote = null;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        // Handle quotes
        if ((char === '"' || char === "'") && str[i - 1] !== '\\') {
            if (quote === char) quote = null;
            else if (!quote) quote = char;
        }

        // Handle parentheses
        if (!quote) {
            if (char === '(') parenthesisLevel++;
            else if (char === ')') parenthesisLevel--;
        }

        // Check for delimiter
        // Need to check substring if delimiter length > 1
        const isDelimiter = !quote && parenthesisLevel === 0 && str.substring(i, i + delimiter.length) === delimiter;

        if (isDelimiter) {
            parts.push(current);
            current = '';
            i += delimiter.length - 1; // Skip delimiter
        } else {
            current += char;
        }
    }
    parts.push(current);
    return parts.map(p => p.trim());
};


// --- Variable Resolution ---
const resolveVariable = (path, context) => {
    // path e.g. "replies.budget" or "api_responses.search_product.0.name"
    // context e.g. { replies: {...}, api_responses: {...}, now: Date... }

    const parts = path.split('.');
    let current = context;

    for (const part of parts) {
        if (current === undefined || current === null) return null;

        // Handle array index access if part is number
        if (Array.isArray(current) && !isNaN(part)) {
            current = current[parseInt(part)];
        } else {
            current = current[part];
        }
    }

    return current;
};
