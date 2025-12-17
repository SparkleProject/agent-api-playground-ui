
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
        const parts = splitByTopLevel(expr, '==');
        if (parts.length > 1) {
            const [left, right] = parts;
            return evalComparison(left, context) == evalComparison(right, context);
        }
    }
    if (expr.includes('!=')) {
        const parts = splitByTopLevel(expr, '!=');
        if (parts.length > 1) {
            const [left, right] = parts;
            return evalComparison(left, context) != evalComparison(right, context);
        }
    }
    return evalComparison(expr, context);
};

// Handle >, <, >=, <=
const evalComparison = (expr, context) => {
    // Check >=, <= first as they contain <, >
    if (expr.includes('>=')) {
        const parts = splitByTopLevel(expr, '>=');
        if (parts.length > 1) {
            const [left, right] = parts;
            return evalValue(left, context) >= evalValue(right, context);
        }
    }
    if (expr.includes('<=')) {
        const parts = splitByTopLevel(expr, '<=');
        if (parts.length > 1) {
            const [left, right] = parts;
            return evalValue(left, context) <= evalValue(right, context);
        }
    }
    if (expr.includes('>')) {
        const parts = splitByTopLevel(expr, '>');
        if (parts.length > 1) {
            const [left, right] = parts;
            return evalValue(left, context) > evalValue(right, context);
        }
    }
    if (expr.includes('<')) {
        const parts = splitByTopLevel(expr, '<');
        if (parts.length > 1) {
            const [left, right] = parts;
            return evalValue(left, context) < evalValue(right, context);
        }
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

    // Handle Object Literal { k: v, ... }
    if (expr.startsWith('{') && expr.endsWith('}')) {
        const content = expr.substring(1, expr.length - 1);
        const properties = splitByTopLevel(content, ',');
        const obj = {};
        for (const prop of properties) {
            if (prop.includes(':')) {
                // simple split by first colon
                const colonIdx = prop.indexOf(':');
                const keyStr = prop.substring(0, colonIdx).trim();
                const valStr = prop.substring(colonIdx + 1).trim();

                // Key can be quote or bare
                let key = keyStr;
                if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
                    key = key.substring(1, key.length - 1);
                }

                obj[key] = evaluateExpression(valStr, context);
            }
        }
        return obj;
    }

    // Handle String Concatenation (+) - Check BEFORE built-ins like ?string
    if (expr.includes('+')) {
        // Simple split by + that respects quotes/nesting
        const parts = splitByTopLevel(expr, '+');
        if (parts.length > 1) {
            return parts.reduce((acc, part) => {
                const val = evalValue(part, context);
                return acc + (val === null || val === undefined ? '' : String(val));
            }, '');
        }
    }

    // Handle Not (!)
    if (expr.startsWith('!')) {
        return !evalValue(expr.substring(1), context);
    }

    // Handle Existence: ?? (Special case: check at end, treat as boolean result)
    if (expr.endsWith('??')) {
        const variable = expr.replace('??', '').trim();
        const val = resolveVariable(variable, context);
        return val !== null && val !== undefined;
    }

    // Handle Built-in Chain (anything with ?)
    if (expr.includes('?')) {
        const parts = splitByTopLevel(expr, '?');
        if (parts.length > 1) {
            let val = evaluateExpression(parts[0], context);

            for (let i = 1; i < parts.length; i++) {
                const part = parts[i].trim();

                // ?string
                if (part === 'string') {
                    val = val ? String(val) : "";
                    continue;
                }

                // ?size
                if (part === 'size') {
                    if (Array.isArray(val)) val = val.length;
                    else if (typeof val === 'object' && val !== null) val = Object.keys(val).length;
                    else if (typeof val === 'string') val = val.length;
                    else val = 0;
                    continue;
                }

                // ?has_content
                if (part === 'has_content') {
                    if (val === null || val === undefined) val = false;
                    else if (typeof val === 'string' || Array.isArray(val)) val = val.length > 0;
                    else if (typeof val === 'object') val = Object.keys(val).length > 0;
                    else val = true;
                    continue;
                }

                // ?join('sep')
                if (part.startsWith('join(') && part.endsWith(')')) {
                    if (Array.isArray(val)) {
                        const content = part.substring(5, part.length - 1);
                        let separator = ',';
                        if ((content.startsWith("'") && content.endsWith("'")) ||
                            (content.startsWith('"') && content.endsWith('"'))) {
                            separator = content.substring(1, content.length - 1);
                        }
                        val = val.join(separator);
                    }
                    continue;
                }

                // ?split('sep')
                if (part.startsWith('split(') && part.endsWith(')')) {
                    if (typeof val === 'string') {
                        const content = part.substring(6, part.length - 1);
                        let separator = ',';
                        if ((content.startsWith("'") && content.endsWith("'")) ||
                            (content.startsWith('"') && content.endsWith('"'))) {
                            separator = content.substring(1, content.length - 1);
                        }
                        val = val.split(separator);
                    }
                    continue;
                }

                // ?map(x -> ...)
                if (part.startsWith('map(') && part.endsWith(')')) {
                    if (Array.isArray(val)) {
                        const argsContent = part.substring(4, part.length - 1);
                        if (argsContent.includes('->')) {
                            const [varName, body] = argsContent.split('->').map(s => s.trim());
                            val = val.map(item => {
                                const mappedContext = { ...context, [varName]: item };
                                return evaluateExpression(body, mappedContext);
                            });
                        }
                    }
                    continue;
                }
            }
            return val;
        }
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
    let braceLevel = 0;
    let bracketLevel = 0;
    let quote = null;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        // Handle quotes
        if ((char === '"' || char === "'") && str[i - 1] !== '\\') {
            if (quote === char) quote = null;
            else if (!quote) quote = char;
        }

        // Handle parentheses and other brackets
        if (!quote) {
            if (char === '(') parenthesisLevel++;
            else if (char === ')') parenthesisLevel--;
            else if (char === '{') braceLevel++;
            else if (char === '}') braceLevel--;
            else if (char === '[') bracketLevel++;
            else if (char === ']') bracketLevel--;
        }

        // Check for delimiter
        const isDelimiter = !quote &&
            parenthesisLevel === 0 &&
            braceLevel === 0 &&
            bracketLevel === 0 &&
            str.substring(i, i + delimiter.length) === delimiter;

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
