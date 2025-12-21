"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkflowStore } from "@/stores/workflowStore";
import { toast } from "@/stores/toastStore";
import { generateWorkflowId } from "@/utils/id-generator";
import { Sparkles } from "lucide-react";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  Button,
  Spinner
} from "@/components";
import { useGenerateWorkflowFromAIMutation } from "@/hooks/useWorkflowsQuery";
import type { GenerateWorkflowFromAIRequest } from "@/lib/api/types";
import { ImageUploadSection, TextInputSection, MissingFieldsForm } from "@/components/create";
import { useImagePaste } from "@/hooks/useImagePaste";
import { convertImageToBase64 } from "@/utils/image";
import { ROUTES } from "@/config/constants";

export default function CreateWorkflowPage() {
  const router = useRouter();
  const generateWorkflowMutation = useGenerateWorkflowFromAIMutation();
  const { saveWorkflowToStorage } = useWorkflowStore();

  const [image, setImage] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<any>(null);
  const [missingFields, setMissingFields] = useState<any[]>([]);
  const [fieldValues, setFieldValues] = useState<
    Record<string, Record<string, any>>
  >({});

  const { pasteIndicator, containerRef } = useImagePaste({
    onImagePasted: (file, preview) => {
      setImage(file);
      setImagePreview(preview);
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(file);
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const handleFieldChange = (nodeId: string, fieldPath: string, value: any) => {
    setFieldValues((prev) => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        [fieldPath]: value
      }
    }));
  };

  const saveAndRedirect = (workflow: any) => {
    const workflowId = workflow.id || generateWorkflowId();
    const workflowWithId = {
      ...workflow,
      id: workflowId
    };

    saveWorkflowToStorage(workflowWithId);

    toast.success("Workflow Generated!", "Redirecting to workflow builder...");

    router.push(`${ROUTES.BUILDER}?type=ai&id=${workflowId}`);
  };

  const handleCompleteFields = () => {
    if (!generatedWorkflow) return;

    const updatedNodes = generatedWorkflow.nodes.map((node: any) => {
      const nodeFields = fieldValues[node.id];
      if (!nodeFields) return node;

      const updatedConfig = { ...node.config };

      Object.keys(nodeFields).forEach((fieldPath) => {
        const parts = fieldPath.split(".");
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
      toast.error(
        "Input Required",
        "Please provide an image or text description"
      );
      return;
    }

    setIsGenerating(true);

    try {
      let imageBase64 = "";
      let imageMimeType = "image/png";
      let textValue = "";

      if (image) {
        const result = await convertImageToBase64(image);
        imageBase64 = result.base64;
        imageMimeType = result.mimeType;
      }

      if (text.trim()) {
        textValue = text.trim();
      }

      const requestBody: GenerateWorkflowFromAIRequest = {
        image: imageBase64,
        imageMimeType: imageMimeType,
        text: textValue
      };

      const result = await generateWorkflowMutation.mutateAsync(requestBody);

      if (!result) {
        toast.error("Generation Failed", "No workflow data received");
        setIsGenerating(false);
        return;
      }

      if (
        result.missingRequiredFields &&
        result.missingRequiredFields.length > 0
      ) {
        setMissingFields(result.missingRequiredFields);
        setGeneratedWorkflow(result);
        setIsGenerating(false);
        return;
      }

      saveAndRedirect(result);
    } catch (error) {
      toast.error(
        "Generation Failed",
        error instanceof Error ? error.message : "Unknown error"
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
            <h3 className="text-lg font-semibold text-gray-900">
              Generate Workflow
            </h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ImageUploadSection
                  image={image}
                  imagePreview={imagePreview}
                  pasteIndicator={pasteIndicator}
                  onImageChange={handleImageChange}
                  onRemoveImage={handleRemoveImage}
                />

                <TextInputSection text={text} onTextChange={setText} />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push(ROUTES.BUILDER)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={
                    isGenerating ||
                    generateWorkflowMutation.isPending ||
                    (!image && !text.trim())
                  }
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

        <MissingFieldsForm
          missingFields={missingFields}
          fieldValues={fieldValues}
          onFieldChange={handleFieldChange}
          onComplete={handleCompleteFields}
          onCancel={() => {
            setMissingFields([]);
            setGeneratedWorkflow(null);
            setFieldValues({});
          }}
        />
      </div>
    </div>
  );
}
