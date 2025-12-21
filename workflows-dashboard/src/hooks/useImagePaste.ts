import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "@/stores/toastStore";
import { processImageFile } from "@/utils/image";

interface UseImagePasteOptions {
  onImagePasted: (file: File, preview: string) => void;
}

export function useImagePaste({ onImagePasted }: UseImagePasteOptions) {
  const [pasteIndicator, setPasteIndicator] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "TEXTAREA" || target?.tagName === "INPUT") {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item.type.startsWith("image/")) {
          e.preventDefault();

          const file = item.getAsFile();
          if (file) {
            processImageFile(file, (processedFile, preview) => {
              onImagePasted(processedFile, preview);
              toast.success("Image Pasted", "Image has been loaded from clipboard");
              setPasteIndicator(true);
              setTimeout(() => setPasteIndicator(false), 2000);
            });
          }
          break;
        }
      }
    },
    [onImagePasted]
  );

  useEffect(() => {
    const container = containerRef.current || document;

    const pasteHandler = (e: Event) => {
      handlePaste(e as ClipboardEvent);
    };

    container.addEventListener("paste", pasteHandler);

    return () => {
      container.removeEventListener("paste", pasteHandler);
    };
  }, [handlePaste]);

  return { pasteIndicator, containerRef };
}

