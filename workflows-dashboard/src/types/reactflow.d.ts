// Augment ReactFlow types for missing exports
import type { ComponentType } from 'react';

declare module 'reactflow' {
  // Type definitions for types that aren't directly exported
  export interface Connection {
    source: string;
    sourceHandle?: string | null;
    target: string;
    targetHandle?: string | null;
  }

  export interface EdgeChange {
    id: string;
    type: 'remove' | 'add' | 'select' | 'position';
    [key: string]: unknown;
  }

  export interface Node {
    id: string;
    type?: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
    width?: number;
    height?: number;
    selected?: boolean;
    [key: string]: unknown;
  }

  export interface Edge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    type?: string;
    animated?: boolean;
    selected?: boolean;
    [key: string]: unknown;
  }

  export interface EdgeProps {
    id: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    sourcePosition: Position;
    targetPosition: Position;
    style?: React.CSSProperties;
    markerEnd?: string;
    [key: string]: unknown;
  }

  // These are already exported but TypeScript can't find them
  // This augmentation ensures they're available
  export const Background: ComponentType<any>;
  export const Controls: ComponentType<any>;
  export const MiniMap: ComponentType<any>;
  export const useNodesState: <T extends Node = Node>(
    initialNodes: T[]
  ) => [T[], (changes: any[] | T[] | ((nodes: T[]) => T[])) => void];
  export const useEdgesState: <T extends Edge = Edge>(
    initialEdges: T[]
  ) => [T[], (changes: EdgeChange[] | T[] | ((edges: T[]) => T[])) => void];
  export const addEdge: (connection: Connection, edges: Edge[]) => Edge[];
  export const applyNodeChanges: (changes: any[], nodes: Node[]) => Node[];
  export const applyEdgeChanges: (changes: EdgeChange[], edges: Edge[]) => Edge[];
  
  // Constants
  export const ConnectionMode: {
    Strict: 'strict';
    Loose: 'loose';
  };
  
  export enum Position {
    Left = 'left',
    Top = 'top',
    Right = 'right',
    Bottom = 'bottom',
  }
  
  export interface NodeProps {
    id: string;
    data: Record<string, unknown>;
    selected?: boolean;
    type?: string;
    style?: React.CSSProperties;
    [key: string]: unknown;
  }
  
  // Additional type exports
  export type NodeTypes = Record<string, ComponentType<any>>;
  export type ReactFlowInstance = any;
  export enum BackgroundVariant {
    Lines = 'lines',
    Dots = 'dots',
    Cross = 'cross',
  }
}
