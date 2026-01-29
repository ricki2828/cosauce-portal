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
  onLayoutToggle?: (employeeId: string, currentLayout: 'horizontal' | 'vertical' | 'grouped') => Promise<void>;
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
  layoutDirections: Map<string, 'horizontal' | 'vertical' | 'grouped'>,
  onToggleLayout: (nodeId: string, currentLayout: 'horizontal' | 'vertical' | 'grouped') => void
): { nodes: Node[]; edges: Edge[]; width: number; height: number } {
  const flowNodes: Node[] = [];
  const flowEdges: Edge[] = [];
  const HORIZONTAL_SPACING = 250;
  const VERTICAL_SPACING = 150;

  let currentX = xOffset;
  let maxHeight = VERTICAL_SPACING; // Track the maximum height of this level

  // Sort nodes by client (account_id) first, then department, then name
  // This keeps employees from the same team/client grouped together
  const sortedNodes = [...nodes].sort((a, b) => {
    // Prioritize grouping by client (account_id)
    if (a.account_id && b.account_id) {
      if (a.account_id !== b.account_id) {
        return a.account_id.localeCompare(b.account_id);
      }
    } else if (a.account_id && !b.account_id) {
      return -1;
    } else if (!a.account_id && b.account_id) {
      return 1;
    }

    // Then group by department
    if (a.department && b.department) {
      if (a.department !== b.department) {
        return a.department.localeCompare(b.department);
      }
    } else if (a.department && !b.department) {
      return -1;
    } else if (!a.department && b.department) {
      return 1;
    }

    // Finally sort by name
    return a.name.localeCompare(b.name);
  });

  sortedNodes.forEach((node, index) => {
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
        onToggleLayout: hasReports ? () => onToggleLayout(nodeId, layoutDirection) : undefined
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
        let totalHeight = VERTICAL_SPACING; // Start with space for current node
        let maxWidth = 0; // Track the widest child subtree

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

          // Adjust Y position ONLY for the direct child (first node)
          // Descendants maintain their relative positions
          if (childGraph.nodes.length > 0) {
            const directChildNode = childGraph.nodes[0];
            const yOffset = childY - directChildNode.position.y;

            // Apply offset to all nodes so they move together
            childGraph.nodes.forEach(n => {
              n.position.y += yOffset;
            });

            // Move down by the full height of this subtree
            childY += childGraph.height;
            totalHeight += childGraph.height;

            // Track the maximum width needed
            maxWidth = Math.max(maxWidth, childGraph.width);
          }

          flowNodes.push(...childGraph.nodes);
          flowEdges.push(...childGraph.edges);
        });

        maxHeight = Math.max(maxHeight, totalHeight);
        // Use the maximum width of all stacked children, or minimum spacing
        currentX += Math.max(maxWidth, HORIZONTAL_SPACING);
      } else if (layoutDirection === 'grouped') {
        // Grouped layout: create vertical columns grouped by client/department
        // Separate into clients and departments to keep them together
        const clientGroups = new Map<string, OrgNode[]>();
        const departmentGroups = new Map<string, OrgNode[]>();
        const otherNodes: OrgNode[] = [];

        node.reports.forEach(childNode => {
          if (childNode.account_id) {
            // Has client - group by client
            if (!clientGroups.has(childNode.account_id)) {
              clientGroups.set(childNode.account_id, []);
            }
            clientGroups.get(childNode.account_id)!.push(childNode);
          } else if (childNode.department) {
            // Has department only - group by department
            if (!departmentGroups.has(childNode.department)) {
              departmentGroups.set(childNode.department, []);
            }
            departmentGroups.get(childNode.department)!.push(childNode);
          } else {
            // Neither client nor department
            otherNodes.push(childNode);
          }
        });

        // Layout order: All clients first, then all departments, then other
        const allGroups = [
          ...Array.from(clientGroups.entries()).sort((a, b) => a[0].localeCompare(b[0])),
          ...Array.from(departmentGroups.entries()).sort((a, b) => a[0].localeCompare(b[0])),
          ...(otherNodes.length > 0 ? [['Other', otherNodes] as [string, OrgNode[]]] : [])
        ];

        // Lay out each group as a vertical column
        allGroups.forEach(([groupKey, groupNodes]) => {
          let groupX = currentX;
          let childY = (depth + 1) * VERTICAL_SPACING;
          let groupHeight = VERTICAL_SPACING; // Start with space for current node
          let groupMaxWidth = 0; // Track the widest child in this group

          groupNodes.forEach((childNode) => {
            const childGraph = buildFlowGraph(
              [childNode],
              depth + 1,
              nodeId,
              groupX,
              onEdit,
              onDelete,
              layoutDirections,
              onToggleLayout
            );

            // Stack vertically within the group
            // Adjust Y position ONLY for the direct child (first node)
            // Descendants maintain their relative positions
            if (childGraph.nodes.length > 0) {
              const directChildNode = childGraph.nodes[0];
              const yOffset = childY - directChildNode.position.y;

              // Apply offset to all nodes so they move together
              childGraph.nodes.forEach(n => {
                n.position.y += yOffset;
              });

              // Move down by the full height of this subtree
              childY += childGraph.height;
              groupHeight += childGraph.height;

              // Track the maximum width needed in this group
              groupMaxWidth = Math.max(groupMaxWidth, childGraph.width);
            }

            flowNodes.push(...childGraph.nodes);
            flowEdges.push(...childGraph.edges);
          });

          maxHeight = Math.max(maxHeight, groupHeight);
          // Move to next column using the maximum width of this group
          currentX += Math.max(groupMaxWidth, HORIZONTAL_SPACING);
        });
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

        // Track height including children
        maxHeight = Math.max(maxHeight, VERTICAL_SPACING + childGraph.height);

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
    width: currentX - xOffset || HORIZONTAL_SPACING,
    height: maxHeight
  };
}

export default function OrgChart({ orgTree, onEdit, onDelete, onLayoutToggle }: OrgChartProps) {
  // Extract layout directions from employee data (comes from database)
  const layoutDirections = useMemo(() => {
    const map = new Map<string, 'horizontal' | 'vertical' | 'grouped'>();

    const extractLayouts = (nodes: OrgNode[]) => {
      nodes.forEach(node => {
        map.set(node.id, node.layout_direction || 'horizontal');
        if (node.reports && node.reports.length > 0) {
          extractLayouts(node.reports);
        }
      });
    };

    extractLayouts(orgTree);
    return map;
  }, [orgTree]);

  // Toggle layout direction for a node and save to database
  const handleToggleLayout = useCallback(async (nodeId: string, currentLayout: 'horizontal' | 'vertical' | 'grouped') => {
    if (onLayoutToggle) {
      await onLayoutToggle(nodeId, currentLayout);
    }
  }, [onLayoutToggle]);

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

  // Generate a key based on employee data to force re-render when performance changes
  const graphKey = useMemo(() => {
    const flattenTree = (nodes: OrgNode[]): string[] => {
      const result: string[] = [];
      nodes.forEach(node => {
        result.push(`${node.id}-${node.performance || 'null'}-${node.potential || 'null'}-${node.status}`);
        if (node.reports && node.reports.length > 0) {
          result.push(...flattenTree(node.reports));
        }
      });
      return result;
    };
    return flattenTree(orgTree).join('_');
  }, [orgTree]);

  return (
    <div className="w-full h-full bg-gray-50">
      <ReactFlow
        key={graphKey}
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
