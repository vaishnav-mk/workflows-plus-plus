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
      <label className="block text-xs font-semibold text-gray-900 mb-2">
        <FileText className="w-3.5 h-3.5 inline mr-1.5" />
        Describe Your Workflow (Optional)
      </label>
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Example: Create a workflow that fetches data from an API, stores it in KV, and returns the result..."
        rows={12}
        className="w-full px-3 py-2.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none bg-white"
      />
      <p className="text-[10px] text-gray-500 mt-1.5">{text.length} characters</p>
    </div>
  );
}
