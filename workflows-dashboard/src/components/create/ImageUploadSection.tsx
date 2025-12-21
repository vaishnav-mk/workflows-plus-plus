"use client";

import { Upload, X } from "lucide-react";
import { Button } from "@/components";
import Image from "next/image";

interface ImageUploadSectionProps {
  image: File | null;
  imagePreview: string | null;
  pasteIndicator: boolean;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
}

export function ImageUploadSection({
  image,
  imagePreview,
  pasteIndicator,
  onImageChange,
  onRemoveImage
}: ImageUploadSectionProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Upload or Paste Image (Optional)
      </label>
      {!image ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
            pasteIndicator
              ? "border-green-500 bg-green-50"
              : "border-gray-300 hover:border-[#056DFF]"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            onChange={onImageChange}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className="cursor-pointer flex flex-col items-center"
          >
            <Upload
              className={`w-12 h-12 mb-4 ${pasteIndicator ? "text-green-500" : "text-gray-400"}`}
            />
            <span className="text-sm text-gray-600 mb-1">
              {pasteIndicator
                ? "Image pasted!"
                : "Click to upload, drag and drop, or paste image (Ctrl/Cmd+V)"}
            </span>
            <span className="text-xs text-gray-500">
              PNG, JPG, GIF up to 10MB
            </span>
          </label>
        </div>
      ) : (
        <div className="relative w-full h-96">
          <Image
            src={imagePreview || ""}
            alt="Preview"
            fill
            className="object-contain rounded-lg border border-gray-200"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onRemoveImage}
            className="absolute top-2 right-2 z-10"
          >
            <X className="w-4 h-4 mr-1" />
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}

