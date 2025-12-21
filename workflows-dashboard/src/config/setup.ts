import {
  Cloud,
  Database,
  Key,
  Workflow,
  Server,
  Globe,
  Box,
  Zap,
  Search,
  Brain,
  Network,
  Monitor,
  Bot,
  Link
} from "lucide-react";
import type { CloudflareProduct, RequiredPermission } from "@/types/setup";

export const CLOUDFLARE_PRODUCTS: CloudflareProduct[] = [
  {
    icon: Cloud,
    name: "Workers",
    description: "Serverless functions at the edge",
    comingSoon: false
  },
  {
    icon: Workflow,
    name: "Workflows",
    description: "Orchestrate serverless workflows",
    comingSoon: false
  },
  {
    icon: Database,
    name: "D1",
    description: "SQLite database",
    comingSoon: false
  },
  {
    icon: Key,
    name: "KV",
    description: "Key-value storage",
    comingSoon: false
  },
  { icon: Box, name: "R2", description: "Object storage", comingSoon: true },
  {
    icon: Globe,
    name: "Pages",
    description: "Static site hosting",
    comingSoon: false
  },
  {
    icon: Zap,
    name: "AI",
    description: "Workers AI models",
    comingSoon: false
  },
  {
    icon: Search,
    name: "AI Search",
    description: "AI-powered search",
    comingSoon: true
  },
  {
    icon: Brain,
    name: "Vectorize",
    description: "Vector database",
    comingSoon: true
  },
  {
    icon: Network,
    name: "AI Gateway",
    description: "AI request gateway",
    comingSoon: true
  },
  {
    icon: Monitor,
    name: "Browser Use",
    description: "Browser automation",
    comingSoon: true
  },
  {
    icon: Bot,
    name: "Agents",
    description: "AI agents and automation",
    comingSoon: false
  },
  {
    icon: Link,
    name: "MCP",
    description: "Model Context Protocol",
    comingSoon: false
  }
];

export const REQUIRED_PERMISSIONS: RequiredPermission[] = [
  {
    permission: "AI Search:Edit",
    reason: "To use AI-powered search capabilities"
  },
  {
    permission: "Workers R2 SQL:Read",
    reason: "To read R2 SQL data"
  },
  {
    permission: "Workers Observability:Edit",
    reason: "To monitor and observe worker performance"
  },
  {
    permission: "Browser Rendering:Edit",
    reason: "To use browser automation features"
  },
  {
    permission: "AI Gateway:Edit",
    reason: "To manage AI request routing"
  },
  {
    permission: "Workers AI:Edit",
    reason: "To use Workers AI models"
  },
  {
    permission: "Vectorize:Edit",
    reason: "To manage vector databases"
  },
  {
    permission: "D1:Edit",
    reason: "To manage D1 databases"
  },
  {
    permission: "Workers R2 Storage:Edit",
    reason: "To manage R2 object storage"
  },
  {
    permission: "Workers Tail:Read",
    reason: "To read worker logs and tail output"
  },
  {
    permission: "Workers KV Storage:Edit",
    reason: "To manage KV namespaces"
  },
  {
    permission: "Workers Scripts:Edit",
    reason: "To deploy and manage Cloudflare Workers"
  }
];

export const SETUP_STEPS = [
  {
    id: "validate-token",
    label: "Validating token",
    icon: "Shield"
  },
  {
    id: "databases",
    label: "Getting list of databases",
    icon: "Database"
  },
  {
    id: "kv-namespaces",
    label: "Listing KV namespaces",
    icon: "Key"
  },
  {
    id: "workflows",
    label: "Listing workflows",
    icon: "Workflow"
  },
  {
    id: "workers",
    label: "Listing workers",
    icon: "Server"
  }
] as const;

