"use client";

import { FileText } from "lucide-react";

interface TextInputSectionProps {
  text: string;
  onTextChange: (value: string) => void;
}

export function TextInputSection({
  text,
  onTextChange
}: TextInputSectionProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <FileText className="w-4 h-4 inline mr-1" />
        Describe Your Workflow (Optional)
      </label>
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Example: Create a workflow that fetches data from an API, stores it in KV, and returns the result..."
        rows={12}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#056DFF] focus:border-[#056DFF] resize-none text-sm"
      />
      <p className="text-xs text-gray-500 mt-2">{text.length} characters</p>
    </div>
  );
}

