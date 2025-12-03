declare module 'react-force-graph-2d' {
  import { Component, RefObject } from 'react';
  
  export interface ForceGraph2DProps {
    ref?: RefObject<any>;
    graphData: {
      nodes: any[];
      links: any[];
    };
    nodeLabel?: (node: any) => string;
    nodeColor?: (node: any) => string;
    linkColor?: (link: any) => string;
    linkWidth?: (link: any) => number;
    onNodeClick?: (node: any) => void;
    nodeVal?: (node: any) => number;
    nodeRelSize?: number;
    nodePointerAreaPaint?: (node: any, color: string, ctx: CanvasRenderingContext2D) => void;
    enableNodeDrag?: boolean;
    onRenderFramePost?: (ctx: CanvasRenderingContext2D) => void;
    cooldownTicks?: number;
    width?: number;
    height?: number;
    enableZoomInteraction?: boolean;
    enablePanInteraction?: boolean;
    [key: string]: any;
  }
  
  const ForceGraph2D: Component<ForceGraph2DProps>;
  export default ForceGraph2D;
}

