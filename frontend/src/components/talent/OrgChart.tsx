import React, { useMemo, useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  type Node,
  type Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { OrgNode, Employee } from '../../lib/talent-types';
import EmployeeNode from './EmployeeNode';
import GroupNode from './GroupNode';

interface OrgChartProps {
  orgTree: OrgNode[];
  onEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
}

// Custom node types
const nodeTypes = {
  employee: EmployeeNode,
  group: GroupNode
};

// Convert org tree to ReactFlow nodes and edges
function buildFlowGraph(
  nodes: OrgNode[],
  depth: number = 0,
  parentId: string | null = null,
  xOffset: number = 0,
  onEdit: (employee: Employee) => void,
  onDelete: (id: string) => void,
  layoutDirections: Map<string, 'horizontal' | 'vertical'>,
  onToggleLayout: (nodeId: string) => void
): { nodes: Node[]; edges: Edge[]; width: number } {
  const flowNodes: Node[] = [];
  const flowEdges: Edge[] = [];
  const HORIZONTAL_SPACING = 250;
  const VERTICAL_SPACING = 150;

  let currentX = xOffset;

  nodes.forEach((node, index) => {
    // Create node
    const nodeId = node.id;
    const hasReports = node.reports && node.reports.length > 0;
    const layoutDirection = layoutDirections.get(nodeId) || 'horizontal';

    flowNodes.push({
      id: nodeId,
      type: 'employee',
      position: { x: currentX, y: depth * VERTICAL_SPACING },
      data: {
        employee: node,
        onEdit: () => onEdit(node),
        onDelete: () => onDelete(node.id),
        hasReports,
        layoutDirection,
        onToggleLayout: hasReports ? () => onToggleLayout(nodeId) : undefined
      }
    });

    // Create edge from parent
    if (parentId) {
      flowEdges.push({
        id: `${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        type: ConnectionLineType.SmoothStep,
        style: { stroke: '#6b7280', strokeWidth: 2 },
        animated: false
      });
    }

    // Recursively process children
    if (hasReports) {
      if (layoutDirection === 'vertical') {
        // Vertical layout: stack children vertically at same X position
        let childY = (depth + 1) * VERTICAL_SPACING;
        node.reports.forEach((childNode, childIndex) => {
          const childGraph = buildFlowGraph(
            [childNode],
            depth + 1,
            nodeId,
            currentX,
            onEdit,
            onDelete,
            layoutDirections,
            onToggleLayout
          );

          // Adjust Y positions for vertical stacking
          childGraph.nodes.forEach(n => {
            n.position.y = childY;
            childY += VERTICAL_SPACING;
          });

          flowNodes.push(...childGraph.nodes);
          flowEdges.push(...childGraph.edges);
        });

        currentX += HORIZONTAL_SPACING;
      } else {
        // Horizontal layout: spread children horizontally (original behavior)
        const childGraph = buildFlowGraph(
          node.reports,
          depth + 1,
          nodeId,
          currentX,
          onEdit,
          onDelete,
          layoutDirections,
          onToggleLayout
        );

        flowNodes.push(...childGraph.nodes);
        flowEdges.push(...childGraph.edges);

        // Adjust current position for next sibling
        currentX += childGraph.width;
      }
    } else {
      currentX += HORIZONTAL_SPACING;
    }
  });

  return {
    nodes: flowNodes,
    edges: flowEdges,
    width: currentX - xOffset || HORIZONTAL_SPACING
  };
}

export default function OrgChart({ orgTree, onEdit, onDelete }: OrgChartProps) {
  // Track layout direction for each node (horizontal by default)
  const [layoutDirections, setLayoutDirections] = useState<Map<string, 'horizontal' | 'vertical'>>(new Map());

  // Toggle layout direction for a node
  const handleToggleLayout = useCallback((nodeId: string) => {
    setLayoutDirections(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(nodeId) || 'horizontal';
      newMap.set(nodeId, current === 'horizontal' ? 'vertical' : 'horizontal');
      return newMap;
    });
  }, []);

  // Build ReactFlow graph
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!orgTree || orgTree.length === 0) {
      return { nodes: [], edges: [] };
    }

    const graph = buildFlowGraph(orgTree, 0, null, 0, onEdit, onDelete, layoutDirections, handleToggleLayout);
    return graph;
  }, [orgTree, onEdit, onDelete, layoutDirections, handleToggleLayout]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when they change (e.g., when layout toggle is clicked)
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (orgTree.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-24 h-24 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <p className="text-gray-500 text-lg">No employees to display</p>
          <p className="text-gray-400 text-sm mt-2">
            Add your first employee to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const status = node.data?.employee?.status;
            if (status === 'active') return '#10b981';
            if (status === 'pending') return '#f59e0b';
            if (status === 'onboarding') return '#3b82f6';
            return '#ef4444';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}
