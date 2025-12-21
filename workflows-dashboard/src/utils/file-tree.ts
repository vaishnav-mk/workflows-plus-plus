import type { FileTreeNode, Module } from "@/types/worker";

export function buildFileTree(modules: Module[]): FileTreeNode[] {
  if (!modules.length) return [];

  const roots: FileTreeNode[] = [];

  const getOrCreateFolder = (
    nodes: FileTreeNode[],
    name: string,
    parentPath: string
  ): FileTreeNode => {
    const path = parentPath ? `${parentPath}/${name}` : name;
    const existing = nodes.find(
      (n) => n.type === "folder" && n.name === name
    );
    if (existing) {
      return existing;
    }

    const folder: FileTreeNode = {
      type: "folder",
      name,
      path,
      children: []
    };
    nodes.push(folder);
    return folder;
  };

  modules.forEach((module) => {
    const segments = module.name.split("/");

    if (segments.length === 1) {
      roots.push({
        type: "file",
        name: module.name,
        path: module.name,
        module
      });
      return;
    }

    let currentNodes = roots;
    let parentPath = "";

    for (let i = 0; i < segments.length - 1; i++) {
      const folderName = segments[i];
      const folderNode = getOrCreateFolder(
        currentNodes,
        folderName,
        parentPath
      );
      parentPath = folderNode.path;
      if (folderNode.type === "folder") {
        currentNodes = folderNode.children;
      } else {
        break;
      }
    }

    const fileName = segments[segments.length - 1];
    const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;

    const exists = currentNodes.some(
      (n) => n.type === "file" && n.name === fileName && n.path === filePath
    );
    if (!exists) {
      currentNodes.push({
        type: "file",
        name: fileName,
        path: filePath,
        module
      });
    }
  });

  const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
    const folders: FileTreeNode[] = [];
    const files: FileTreeNode[] = [];

    nodes.forEach((node) => {
      if (node.type === "folder") {
        folders.push({
          ...node,
          children: sortNodes(node.children)
        });
      } else {
        files.push(node);
      }
    });

    folders.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));

    return [...folders, ...files];
  };

  return sortNodes(roots);
}

export function decodeModuleContent(module?: { content_base64?: string } | null): string {
  if (!module) return "";
  try {
    return atob(module.content_base64 || "");
  } catch {
    return "";
  }
}

