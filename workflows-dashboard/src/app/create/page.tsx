'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CloudflareLayout } from '../components/CloudflareLayout';
import { useApiStore } from '../../stores/apiStore';
import { useWorkflowStore } from '../../stores/workflowStore';
import { toast } from '../../stores/toastStore';
import { Upload, FileText, Loader2, Clipboard } from 'lucide-react';
import Link from 'next/link';

export default function CreateWorkflowPage() {
  const router = useRouter();
  const { generateWorkflowFromAI, loading } = useApiStore();
  const { saveWorkflowToStorage } = useWorkflowStore();
  
  const [image, setImage] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pasteIndicator, setPasteIndicator] = useState(false);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<any>(null);
  const [missingFields, setMissingFields] = useState<any[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, any>>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid File', 'Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File Too Large', 'Image must be less than 10MB');
      return;
    }
    
    setImage(file);
    
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handlePaste = async (e: ClipboardEvent) => {
    const target = e.target as HTMLElement;
    if (target?.tagName === 'TEXTAREA' || target?.tagName === 'INPUT') {
      return;
    }

    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        
        const file = item.getAsFile();
        if (file) {
          processImageFile(file);
          toast.success('Image Pasted', 'Image has been loaded from clipboard');
          
          setPasteIndicator(true);
          setTimeout(() => setPasteIndicator(false), 2000);
        }
        break;
      }
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  useEffect(() => {
    const container = containerRef.current || document;
    
    const pasteHandler = (e: Event) => {
      handlePaste(e as ClipboardEvent);
    };
    
    container.addEventListener('paste', pasteHandler);
    
    return () => {
      container.removeEventListener('paste', pasteHandler);
    };
  }, []);

  const handleFieldChange = (nodeId: string, fieldPath: string, value: any) => {
    setFieldValues(prev => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        [fieldPath]: value
      }
    }));
  };

  const saveAndRedirect = (workflow: any) => {
    saveWorkflowToStorage(workflow);

    const workflowId = workflow.id;
    toast.success(
      'Workflow Generated!',
      'Redirecting to workflow builder...'
    );
    
    router.push(`/?workflowId=${workflowId}`);
  };

  const handleCompleteFields = () => {
    if (!generatedWorkflow) return;

    // Update workflow nodes with filled fields
    const updatedNodes = generatedWorkflow.nodes.map((node: any) => {
      const nodeFields = fieldValues[node.id];
      if (!nodeFields) return node;

      let updatedConfig = { ...node.config };
      
      Object.keys(nodeFields).forEach(fieldPath => {
        const parts = fieldPath.split('.');
        const value = nodeFields[fieldPath];
        
        if (parts.length === 1) {
          updatedConfig[fieldPath] = value;
        } else {
          let current: any = updatedConfig;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
              current[parts[i]] = {};
            }
            current = current[parts[i]];
          }
          current[parts[parts.length - 1]] = value;
        }
      });

      return {
        ...node,
        config: updatedConfig
      };
    });

    const completedWorkflow = {
      ...generatedWorkflow,
      nodes: updatedNodes
    };

    saveAndRedirect(completedWorkflow);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!image && !text.trim()) {
      toast.error('Input Required', 'Please provide an image or text description');
      return;
    }

    setIsGenerating(true);
    
    try {
      const result = await generateWorkflowFromAI(image || undefined, text.trim() || undefined);
      
      if (result.error) {
        toast.error('Generation Failed', result.error);
        setIsGenerating(false);
        return;
      }

      if (!result.data) {
        toast.error('Generation Failed', 'No workflow data received');
        setIsGenerating(false);
        return;
      }

      if (result.data.missingRequiredFields && result.data.missingRequiredFields.length > 0) {
        setMissingFields(result.data.missingRequiredFields);
        setGeneratedWorkflow(result.data);
        setIsGenerating(false);
        return;
      }

      saveAndRedirect(result.data);
    } catch (error) {
      toast.error(
        'Generation Failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
      setIsGenerating(false);
    }
  };

  return (
    <CloudflareLayout>
      <div className="min-h-screen bg-gray-50" ref={containerRef}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create Workflow with AI</h1>
                <p className="text-gray-600 mt-2">
                  Upload, paste, or describe your workflow, and AI will generate it for you
                </p>
              </div>
              <Link
                href="/"
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                ← Back to Builder
              </Link>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Image Upload Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload or Paste Image (Optional)
              </label>
              {!image ? (
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                    pasteIndicator 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-300 hover:border-blue-400'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    {pasteIndicator ? (
                      <Clipboard className="w-12 h-12 text-green-500 mb-4" />
                    ) : (
                      <Upload className="w-12 h-12 text-gray-400 mb-4" />
                    )}
                    <span className="text-sm text-gray-600 mb-1">
                      {pasteIndicator 
                        ? 'Image pasted!'
                        : 'Click to upload, drag and drop, or paste image (Ctrl/Cmd+V)'}
                    </span>
                    <span className="text-xs text-gray-500">
                      PNG, JPG, GIF up to 10MB
                    </span>
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview || ''}
                    alt="Preview"
                    className="w-full max-h-96 object-contain rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Text Input Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Describe Your Workflow (Optional)
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Example: Create a workflow that fetches data from an API, stores it in KV, and returns the result..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                {text.length} characters
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-3">
              <Link
                href="/"
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isGenerating || loading || (!image && !text.trim())}
                className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isGenerating || loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <span>Generate Workflow</span>
                )}
              </button>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> You can provide both an image and text description for better results. 
                The AI will analyze your image and text to create a workflow with appropriate nodes and connections.
                <br />
                <strong>Quick Tip:</strong> Press Ctrl+V (or Cmd+V on Mac) anywhere on this page to paste an image from your clipboard!
              </p>
            </div>
          </form>

          {/* Missing Required Fields Form */}
          {missingFields.length > 0 && generatedWorkflow && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Complete Required Fields
                  </h2>
                  <p className="text-gray-600 mb-6">
                    The AI generated your workflow, but some required fields need your input to complete the configuration.
                  </p>

                  <div className="space-y-6">
                    {missingFields.map((nodeMissing) => (
                      <div key={nodeMissing.nodeId} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {nodeMissing.nodeLabel} ({nodeMissing.nodeType})
                        </h3>
                        <div className="space-y-3">
                          {nodeMissing.missingFields.map((field: any) => {
                            const currentValue = fieldValues[nodeMissing.nodeId]?.[field.field] || '';
                            
                            return (
                              <div key={field.field}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {field.field.replace(/\./g, ' → ')}
                                  {field.type && (
                                    <span className="text-gray-500 ml-2">({field.type})</span>
                                  )}
                                </label>
                                {field.description && (
                                  <p className="text-xs text-gray-500 mb-1">{field.description}</p>
                                )}
                                <input
                                  type="text"
                                  value={currentValue}
                                  onChange={(e) => handleFieldChange(nodeMissing.nodeId, field.field, e.target.value)}
                                  placeholder={`Enter ${field.field}`}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setMissingFields([]);
                        setGeneratedWorkflow(null);
                        setFieldValues({});
                      }}
                      className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCompleteFields}
                      className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                    >
                      Complete & Continue
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </CloudflareLayout>
  );
}
