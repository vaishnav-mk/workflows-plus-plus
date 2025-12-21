import type { WorkerVersion } from "@/lib/api/types";

export type Module = NonNullable<WorkerVersion["modules"]>[number];

export type FileTreeNode =
  | {
      type: "folder";
      name: string;
      path: string;
      children: FileTreeNode[];
      isOpen?: boolean;
    }
  | {
      type: "file";
      name: string;
      path: string;
      module: Module;
    };

export interface FileTreeItemProps {
  node: FileTreeNode;
  level: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

export interface VersionBinding {
  name: string;
  type: string;
  text?: string;
  json?: boolean;
}

