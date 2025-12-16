import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronRight, ChevronLeft, RotateCcw, Play } from 'lucide-react';
import { evaluateExpression } from '../utils/expressionEngine';
import { ErrorBoundary } from './ErrorBoundary';

export default function WorkflowSimulator({ workflow }) {
    // State for the simulation engine
    // Stack items: { nodes: [], index: 0, type: 'root'|'block'|'loop', expression: '', loopType: '' }
    const [executionStack, setExecutionStack] = useState([]);

    // Context: replies, api_responses, now
    const [context, setContext] = useState({
        replies: {},
        api_responses: {},
        now: new Date()
    });

    // History for Back navigation (snapshots of stack + context)
    const [history, setHistory] = useState([]);

    // UI State
    const [currentInputs, setCurrentInputs] = useState({});
    const [isSimulatingApi, setIsSimulatingApi] = useState(false);
    const [currentStep, setCurrentStep] = useState(null);

    // Initialize simulation
    useEffect(() => {
        if (workflow && Array.isArray(workflow) && workflow.length > 0) {
            resetSimulation();
        } else {
            setCurrentStep(null);
        }
    }, [workflow]);

    // Effect to process the current state and determine the active step
    // This runs whenever stack changes (navigation)
    useEffect(() => {
        if (executionStack.length === 0) return;

        const processFlow = async () => {
            // Helper to get current pointer
            const getPointer = () => executionStack[executionStack.length - 1];
            let pointer = getPointer();

            // If pointer is invalid (end of list), we need to pop frames until we find valid node or end
            while (pointer && pointer.index >= pointer.nodes.length) {
                // If we are in a loop block, check condition to iterate or exit
                if (pointer.type === 'loop_block') {
                    const shouldLoop = evaluateExpression(pointer.expression, context);
                    if (shouldLoop) {
                        // Loop back: Reset index
                        const newStack = [...executionStack];
                        newStack[newStack.length - 1].index = 0;
                        setExecutionStack(newStack);
                        return; // State updated, effect will re-run
                    }
                }

                // Block finished (if/else, or loop exited, or root finished)
                // Pop frame and advance parent
                if (executionStack.length > 1) {
                    const newStack = [...executionStack];
                    newStack.pop(); // Pop current
                    newStack[newStack.length - 1].index++; // Advance parent
                    setExecutionStack(newStack);
                    return; // State updated, effect will re-run
                } else {
                    // Root finished
                    setCurrentStep({ ended: true, type: 'end' });
                    return;
                }
            }

            // We have a valid index
            const node = pointer.nodes[pointer.index];

            // Handle Control Flow Nodes (Decision, Loops) automatically
            if (node.type === 'decision') {
                const condition = evaluateExpression(node.expression?.['en-US'] || node.expression, context);
                const block = condition ? node.if_block : node.else_block;

                if (block && block.length > 0) {
                    // Push block
                    const newFrame = { nodes: block, index: 0, type: 'decision_block' };
                    setExecutionStack([...executionStack, newFrame]);
                } else {
                    // No block for this path, skip decision node
                    const newStack = [...executionStack];
                    newStack[newStack.length - 1].index++;
                    setExecutionStack(newStack);
                }
                return;
            }

            if (node.type === 'while_loop') {
                const shouldEnter = evaluateExpression(node.expression?.['en-US'] || node.expression, context);
                if (shouldEnter) {
                    const newFrame = {
                        nodes: node.actions || [],
                        index: 0,
                        type: 'loop_block',
                        expression: node.expression?.['en-US'] || node.expression
                    };
                    setExecutionStack([...executionStack, newFrame]);
                } else {
                    // Skip loop
                    const newStack = [...executionStack];
                    newStack[newStack.length - 1].index++;
                    setExecutionStack(newStack);
                }
                return;
            }

            if (node.type === 'do_while') {
                // Do-while always enters at least once
                // Note: Logic allows checking entrance, but standard do_while enters then checks exit/repeat
                // We treat it as entering a loop block that checks condition at end (handled in pop logic)
                const newFrame = {
                    nodes: node.actions || [],
                    index: 0,
                    type: 'loop_block',
                    expression: node.expression?.['en-US'] || node.expression
                };
                setExecutionStack([...executionStack, newFrame]);
                return;
            }

            // Interactive Nodes (User Interaction, API Call) stop the flow for UI
            if (node.type === 'user_interaction' || node.type === 'api_call') {
                setCurrentStep(node);
                // Clear inputs if focusing a new user interaction steps
                // But we must preserve inputs if we just re-rendered.
                // We rely on currentInputs state cleanup on Next/Back.
            }
        };

        processFlow();

    }, [executionStack, context]);


    const resetSimulation = () => {
        setExecutionStack([{ nodes: workflow, index: 0, type: 'root' }]);
        setContext({ replies: {}, api_responses: {}, now: new Date() });
        setHistory([]);
        setCurrentInputs({});
        setIsSimulatingApi(false);
    };

    const handleNext = async () => {
        if (!currentStep) return;

        // Snapshot for history
        const snapshot = {
            stack: JSON.parse(JSON.stringify(executionStack)),
            context: JSON.parse(JSON.stringify(context))
        };
        setHistory([...history, snapshot]);

        if (currentStep.type === 'user_interaction' && currentStep.fields) {
            // Validate & Save Inputs
            const newReplies = { ...context.replies };

            // We should ideally check required fields here
            const missingRequired = currentStep.fields.some(f =>
                !f.attributes?.optional && !currentInputs[f.name] && currentInputs[f.name] !== 0
            );

            if (missingRequired) {
                alert("Please fill in all required fields."); // Simple validation for now
                setHistory([...history]); // Revert history add
                return;
            }

            currentStep.fields.forEach(field => {
                if (currentInputs[field.name] !== undefined) {
                    newReplies[field.name] = currentInputs[field.name];
                }
            });

            setContext(prev => ({ ...prev, replies: newReplies }));
        }

        if (currentStep.type === 'api_call') {
            setIsSimulatingApi(true);
            // Mock API Delay
            await new Promise(r => setTimeout(r, 1000));

            // Mock Response storage
            const apiName = currentStep.api_name || 'unknown_api';
            const mockResponse = { status: 'success', data: 'Mocked API Data' };

            setContext(prev => ({
                ...prev,
                api_responses: {
                    ...prev.api_responses,
                    [apiName]: mockResponse
                }
            }));
            setIsSimulatingApi(false);
        }

        // Advance Pointer
        const newStack = [...executionStack];
        newStack[newStack.length - 1].index++;
        setExecutionStack(newStack);
        setCurrentInputs({});
    };

    const handleBack = () => {
        if (history.length > 0) {
            const prevState = history[history.length - 1];
            setExecutionStack(prevState.stack);
            setContext(prevState.context);
            setHistory(history.slice(0, -1));
            setCurrentInputs({});
        }
    };

    const handleInputChange = (fieldName, value) => {
        setCurrentInputs(prev => ({ ...prev, [fieldName]: value }));
    };

    const handleMultiSelectChange = (fieldName, value, isChecked) => {
        setCurrentInputs(prev => {
            const current = prev[fieldName] || [];
            if (isChecked) {
                return { ...prev, [fieldName]: [...current, value] };
            } else {
                return { ...prev, [fieldName]: current.filter(v => v !== value) };
            }
        });
    };

    // Render Field Helper
    const renderField = (field) => {
        const isRequired = !field.attributes?.optional;
        const fieldValue = currentInputs[field.name];

        const label = (
            <label className="block text-sm font-medium text-foreground mb-2">
                {field.name.replace(/_/g, ' ')}
                {isRequired && <span className="text-red-400 ml-1">*</span>}
            </label>
        );

        // Evaluate Options if present
        let options = [];
        if (field.attributes?.options) {
            const result = evaluateExpression(field.attributes.options, context);
            if (Array.isArray(result)) options = result;
            // Handle simple string fallback if expression fails
            else if (typeof field.attributes.options === 'string' && field.attributes.options.startsWith('[')) {
                try { options = JSON.parse(field.attributes.options); } catch (e) { }
            }
        }

        switch (field.type) {
            case 'text':
                return (
                    <div key={field.name} className="mb-4">
                        {label}
                        <input
                            type="text"
                            value={fieldValue || ''}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                            className="w-full px-3 py-2 bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            required={isRequired}
                        />
                    </div>
                );
            case 'numeric':
                return (
                    <div key={field.name} className="mb-4">
                        {label}
                        <input
                            type="number"
                            value={fieldValue || ''}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                            className="w-full px-3 py-2 bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            required={isRequired}
                        />
                    </div>
                );
            case 'date':
                // Evaluate Min/Max
                const min = field.attributes?.min ? evaluateExpression(field.attributes.min, context) : undefined;
                const max = field.attributes?.max ? evaluateExpression(field.attributes.max, context) : undefined;
                return (
                    <div key={field.name} className="mb-4">
                        {label}
                        <input
                            type="date"
                            value={fieldValue || ''}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                            min={min}
                            max={max}
                            className="w-full px-3 py-2 bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            required={isRequired}
                        />
                    </div>
                );
            case 'multiple_choice':
                return (
                    <div key={field.name} className="mb-4">
                        {label}
                        <div className="space-y-2">
                            {options.map((opt, idx) => (
                                <label key={idx} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={field.name}
                                        value={opt.value}
                                        checked={fieldValue === opt.value}
                                        onChange={() => handleInputChange(field.name, opt.value)}
                                        className="text-primary focus:ring-primary"
                                    />
                                    <span className="text-foreground">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            case 'multiple_select':
                return (
                    <div key={field.name} className="mb-4">
                        {label}
                        <div className="space-y-2">
                            {options.map((opt, idx) => (
                                <label key={idx} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        value={opt.value}
                                        checked={(fieldValue || []).includes(opt.value)}
                                        onChange={(e) => handleMultiSelectChange(field.name, opt.value, e.target.checked)}
                                        className="rounded text-primary focus:ring-primary bg-secondary border-border"
                                    />
                                    <span className="text-foreground">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            default:
                return <div key={field.name} className="text-red-400">Unknown type: {field.type}</div>;
        }
    };


    if (!currentStep) return <div className="p-8 text-center text-muted-foreground">Loading workflow...</div>;

    if (currentStep.type === 'end') {
        return (
            <div className="flex flex-col h-full bg-background items-center justify-center p-8">
                <div className="text-center space-y-4">
                    <div className="text-4xl">🎉</div>
                    <h3 className="text-xl font-semibold">Workflow Completed</h3>
                    <button onClick={resetSimulation} className="flex items-center gap-2 mx-auto px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                        <RotateCcw className="w-4 h-4" /> Restart
                    </button>
                    {/* Debug Context View */}
                    <div className="mt-8 text-left w-full max-w-md bg-secondary/30 p-4 rounded text-xs font-mono overflow-auto max-h-48">
                        <div className="font-bold mb-2">Final Context:</div>
                        {JSON.stringify(context.replies, null, 2)}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div className="text-sm font-semibold">
                    {currentStep.type === 'api_call' ? 'API Execution' : 'User Step'}
                </div>
                <button onClick={resetSimulation} className="p-1 hover:bg-secondary rounded" title="Reset">
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {/* Step Content */}
                {currentStep.type === 'user_interaction' && (
                    <>
                        <div className="mb-6 prose prose-invert max-w-none">
                            <ErrorBoundary fallback={<div className="text-red-400">Error rendering prompt</div>}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {extractPrompt(currentStep.prompt) || ''}
                                </ReactMarkdown>
                            </ErrorBoundary>
                        </div>
                        {currentStep.fields?.map(renderField)}
                    </>
                )}

                {currentStep.type === 'api_call' && (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg bg-secondary/20">
                        <div className="text-green-400 mb-2 font-mono">{currentStep.api_name || 'API'}</div>
                        {isSimulatingApi ? (
                            <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                                Calling API...
                            </div>
                        ) : (
                            <div className="text-sm text-center text-muted-foreground">
                                Ready to execute API call.<br />
                                <span className="text-xs opacity-70">(Mock execution)</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-border/50 flex justify-between">
                <button
                    onClick={handleBack}
                    disabled={history.length === 0 || isSimulatingApi}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 disabled:opacity-50 rounded-md"
                >
                    <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                    onClick={handleNext}
                    disabled={isSimulatingApi}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded-md"
                >
                    {currentStep.type === 'api_call' ? (
                        <>Execute <Play className="w-4 h-4" /></>
                    ) : (
                        <>Next <ChevronRight className="w-4 h-4" /></>
                    )}
                </button>
            </div>
        </div>
    );
}

// Helper to handle prompt array or string or object
function extractPrompt(promptObj) {
    if (!promptObj) return '';
    if (typeof promptObj === 'string') return promptObj;
    if (Array.isArray(promptObj)) {
        // Recursively handle array items if needed, or just take first
        return extractPrompt(promptObj[0]);
    }
    if (typeof promptObj === 'object') {
        if (promptObj['en-US']) {
            return extractPrompt(promptObj['en-US']);
        }
        // Fallback: try to find any string value or stringify
        return JSON.stringify(promptObj);
    }
    return String(promptObj);
}
