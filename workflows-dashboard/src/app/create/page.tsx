'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkflowStore } from '../../stores/workflowStore';
import { toast } from '../../stores/toastStore';
import { generateWorkflowId } from '@/utils/id-generator';
import { Upload, FileText, X, Sparkles } from 'lucide-react';
import { PageHeader, Card, CardContent, CardHeader, Button, Input, Spinner } from '@/components';
import { useGenerateWorkflowFromAIMutation } from '../../hooks/useWorkflowsQuery';

export default function CreateWorkflowPage() {
  const router = useRouter();
  const generateWorkflowMutation = useGenerateWorkflowFromAIMutation();
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
    // Ensure workflow has standardized ID
    const workflowId = workflow.id || generateWorkflowId();
    const workflowWithId = {
      ...workflow,
      id: workflowId
    };
    
    saveWorkflowToStorage(workflowWithId);

    toast.success(
      'Workflow Generated!',
      'Redirecting to workflow builder...'
    );
    
    router.push(`/builder?type=ai&id=${workflowId}`);
  };

  const handleCompleteFields = () => {
    if (!generatedWorkflow) return;

    const updatedNodes = generatedWorkflow.nodes.map((node: any) => {
      const nodeFields = fieldValues[node.id];
      if (!nodeFields) return node;

      const updatedConfig = { ...node.config };
      
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
      const requestBody: { image?: string; imageMimeType?: string; text?: string } = {};
      
      if (image) {
        const reader = new FileReader();
        const imageBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(image);
        });

        requestBody.image = imageBase64;
        requestBody.imageMimeType = image.type || 'image/png';
      }
      
      if (text.trim()) {
        requestBody.text = text.trim();
      }

      const result = await generateWorkflowMutation.mutateAsync(requestBody);
      
      if (!result) {
        toast.error('Generation Failed', 'No workflow data received');
        setIsGenerating(false);
        return;
      }

      if (result.missingRequiredFields && result.missingRequiredFields.length > 0) {
        setMissingFields(result.missingRequiredFields);
        setGeneratedWorkflow(result);
        setIsGenerating(false);
        return;
      }

      saveAndRedirect(result);
    } catch (error) {
      toast.error(
        'Generation Failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" ref={containerRef}>
      <div className="w-full px-6 py-8">
        <PageHeader
          title="Create Workflow with AI"
          description="Upload, paste, or describe your workflow, and AI will generate it for you"
        />

        <Card className="mt-6">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Generate Workflow</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image Upload and Text Input Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload or Paste Image (Optional)
                  </label>
                  {!image ? (
                    <div 
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                        pasteIndicator 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-300 hover:border-[#056DFF]'
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
                        <Upload className={`w-12 h-12 mb-4 ${pasteIndicator ? 'text-green-500' : 'text-gray-400'}`} />
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
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>

                {/* Text Input Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Describe Your Workflow (Optional)
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Example: Create a workflow that fetches data from an API, stores it in KV, and returns the result..."
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#056DFF] focus:border-[#056DFF] resize-none text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {text.length} characters
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/builder')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isGenerating || generateWorkflowMutation.isPending || (!image && !text.trim())}
                >
                  {isGenerating || generateWorkflowMutation.isPending ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Workflow
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Missing Required Fields Form */}
        {missingFields.length > 0 && generatedWorkflow && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">
                  Complete Required Fields
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-6">
                  The AI generated your workflow, but some required fields need your input to complete the configuration.
                </p>

                <div className="space-y-6">
                  {missingFields.map((nodeMissing) => (
                    <Card key={nodeMissing.nodeId}>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">
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
                                  <p className="text-xs text-gray-500 mb-2">{field.description}</p>
                                )}
                                <Input
                                  type="text"
                                  value={currentValue}
                                  onChange={(e) => handleFieldChange(nodeMissing.nodeId, field.field, e.target.value)}
                                  placeholder={`Enter ${field.field}`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setMissingFields([]);
                      setGeneratedWorkflow(null);
                      setFieldValues({});
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCompleteFields}
                  >
                    Complete & Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
