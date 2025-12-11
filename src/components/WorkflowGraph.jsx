import { useCallback, useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom node component for user interactions
function UserInteractionNode({ data }) {
    return (
        <div className="px-4 py-3 bg-blue-500/20 border-2 border-blue-500 rounded-lg min-w-[200px] max-w-[300px]">
            <div className="font-semibold text-blue-400 text-sm mb-1">👤 User Interaction</div>
            <div className="text-xs text-foreground/80 line-clamp-2">
                {data.prompt?.['en-US']?.[0]?.substring(0, 100) || 'User input required'}
            </div>
            {data.ended && (
                <div className="mt-1 text-xs text-red-400 font-semibold">🔴 End</div>
            )}
        </div>
    );
}

// Custom node component for API calls
function ApiCallNode({ data }) {
    return (
        <div className="px-4 py-3 bg-green-500/20 border-2 border-green-500 rounded-lg min-w-[200px] max-w-[300px]">
            <div className="font-semibold text-green-400 text-sm mb-1">🔌 API Call</div>
            <div className="text-xs text-foreground/80">
                {data.api_name || 'API Request'}
            </div>
            {data.ended && (
                <div className="mt-1 text-xs text-red-400 font-semibold">🔴 End</div>
            )}
        </div>
    );
}

// Custom node component for decisions
function DecisionNode({ data }) {
    return (
        <div className="px-4 py-3 bg-yellow-500/20 border-2 border-yellow-500 rounded-lg min-w-[200px] max-w-[300px]">
            <div className="font-semibold text-yellow-400 text-sm mb-1">🔀 Decision</div>
            <div className="text-xs text-foreground/80 line-clamp-2 font-mono">
                {data.expression?.['en-US'] || 'Conditional'}
            </div>
            {data.ended && (
                <div className="mt-1 text-xs text-red-400 font-semibold">🔴 End</div>
            )}
        </div>
    );
}

const nodeTypes = {
    user_interaction: UserInteractionNode,
    api_call: ApiCallNode,
    decision: DecisionNode,
};

// Parse wave array and convert to ReactFlow nodes and edges
function parseWaveToGraph(wave) {
    if (!wave || !Array.isArray(wave) || wave.length === 0) {
        return { nodes: [], edges: [] };
    }

    const nodes = [];
    const edges = [];
    const xSpacing = 350;
    const ySpacing = 150;
    let nodeCounter = 0;

    // Process nodes recursively with proper Y positioning
    function processNodes(nodeList, parentId = null, baseX = 0, startY = 0, isIfBranch = false, isElseBranch = false) {
        let currentY = startY;
        let lastNodeId = parentId;

        nodeList.forEach((node, index) => {
            if (!node || !node.id || !node.type) {
                console.warn('Invalid node:', node);
                return;
            }

            const nodeId = node.id;

            // Create ReactFlow node
            nodes.push({
                id: nodeId,
                type: node.type,
                position: { x: baseX, y: currentY },
                data: node,
            });

            // Create edge from parent
            if (lastNodeId && lastNodeId !== nodeId) {
                const edgeLabel = isIfBranch ? 'Yes' : isElseBranch ? 'No' : '';
                const edgeColor = isIfBranch ? '#22c55e' : isElseBranch ? '#ef4444' : '#64748b';

                edges.push({
                    id: `${lastNodeId}-${nodeId}`,
                    source: lastNodeId,
                    target: nodeId,
                    label: edgeLabel,
                    animated: true,
                    style: { stroke: edgeColor },
                });
            }

            currentY += ySpacing;

            // Handle decision nodes with if/else blocks
            if (node.type === 'decision') {
                const ifBlock = node.if_block || [];
                const elseBlock = node.else_block || [];
                const maxBranchY = currentY;

                // Process if-block (left branch)
                if (ifBlock.length > 0) {
                    const ifX = baseX - xSpacing;
                    const ifResult = processNodes(ifBlock, nodeId, ifX, currentY, true, false);
                    currentY = Math.max(currentY, ifResult.endY);
                }

                // Process else-block (right branch)
                if (elseBlock.length > 0) {
                    const elseX = baseX + xSpacing;
                    const elseResult = processNodes(elseBlock, nodeId, maxBranchY, currentY, false, true);
                    currentY = Math.max(currentY, elseResult.endY);
                }

                // If both branches exist, add some extra spacing
                if (ifBlock.length > 0 && elseBlock.length > 0) {
                    currentY += ySpacing / 2;
                }
            }

            lastNodeId = nodeId;
        });

        return { endY: currentY, lastNodeId };
    }

    // Process all top-level nodes
    processNodes(wave, null, 0, 0, false, false);

    return { nodes, edges };
}

export default function WorkflowGraph({ workflow }) {
    const { nodes: initialNodes, edges: initialEdges } = useMemo(
        () => parseWaveToGraph(workflow || []),
        [workflow]
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    if (!workflow || workflow.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                No workflow data available
            </div>
        );
    }

    if (nodes.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                    <div>Failed to parse workflow data</div>
                    <div className="text-xs mt-2">Check console for details</div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-background">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-left"
            >
                <Background />
                <Controls />
                <MiniMap
                    nodeColor={(node) => {
                        switch (node.type) {
                            case 'user_interaction':
                                return '#3b82f6';
                            case 'api_call':
                                return '#22c55e';
                            case 'decision':
                                return '#eab308';
                            default:
                                return '#64748b';
                        }
                    }}
                />
            </ReactFlow>
        </div>
    );
}
