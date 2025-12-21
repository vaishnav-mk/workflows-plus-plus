import { toast } from "@/stores/toastStore";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export function processImageFile(
  file: File,
  onSuccess: (file: File, preview: string) => void
): void {
  if (!file.type.startsWith("image/")) {
    toast.error("Invalid File", "Please select an image file");
    return;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    toast.error("File Too Large", "Image must be less than 10MB");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const preview = reader.result as string;
    onSuccess(file, preview);
  };
  reader.readAsDataURL(file);
}

export async function convertImageToBase64(file: File): Promise<{
  base64: string;
  mimeType: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const base64 = result.split(",")[1];
        resolve({ base64, mimeType: file.type || "image/png" });
      } else {
        reject(new Error("Failed to read image"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

