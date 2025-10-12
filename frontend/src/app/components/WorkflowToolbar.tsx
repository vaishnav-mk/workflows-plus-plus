'use client';

import { 
  Play, 
  Save, 
  Download, 
  Upload, 
  Settings, 
  Share2,
  Code,
  Eye,
  Trash2
} from 'lucide-react';

export function WorkflowToolbar() {
  return (
    <div className="flex items-center space-x-2">
      {/* Primary Actions */}
      <button className="flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors">
        <Play className="w-4 h-4" />
        <span>Run Workflow</span>
      </button>
      
      <button className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors">
        <Code className="w-4 h-4" />
        <span>Edit Code</span>
      </button>
      
      <button className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">
        <Eye className="w-4 h-4" />
        <span>Preview</span>
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-300"></div>

      {/* Secondary Actions */}
      <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors">
        <Save className="w-4 h-4" />
        <span>Save</span>
      </button>
      
      <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors">
        <Download className="w-4 h-4" />
        <span>Export</span>
      </button>
      
      <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors">
        <Upload className="w-4 h-4" />
        <span>Import</span>
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-300"></div>

      {/* Utility Actions */}
      <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors">
        <Share2 className="w-4 h-4" />
        <span>Share</span>
      </button>
      
      <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors">
        <Settings className="w-4 h-4" />
        <span>Settings</span>
      </button>
      
      <button className="flex items-center space-x-2 text-red-600 hover:text-red-900 px-3 py-2 rounded-md hover:bg-red-50 transition-colors">
        <Trash2 className="w-4 h-4" />
        <span>Delete</span>
      </button>
    </div>
  );
}
