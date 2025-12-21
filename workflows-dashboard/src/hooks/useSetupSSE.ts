import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/stores/toastStore";
import type { SetupStep, StepStatus } from "@/types/setup";
import { API_BASE } from "@/config/constants";
import { ROUTES } from "@/config/constants";

interface UseSetupSSEOptions {
  apiToken: string;
  accountId: string;
  steps: SetupStep[];
  updateStep: (id: string, status: StepStatus, message?: string) => void;
  setErrors: (errors: { apiToken?: string; accountId?: string }) => void;
  setIsLoading: (loading: boolean) => void;
}

export function useSetupSSE({
  apiToken,
  accountId,
  steps,
  updateStep,
  setErrors,
  setIsLoading
}: UseSetupSSEOptions) {
  const router = useRouter();

  const handleSubmit = async () => {
    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${API_BASE}/setup/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          apiToken: apiToken.trim(),
          accountId: accountId.trim()
        })
      });

      if (!response.ok) {
        throw new Error("Failed to start setup stream");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Failed to get response stream");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.trim()) continue;

          let eventType = "message";
          let dataStr = "";

          for (const line of chunk.split("\n")) {
            if (line.startsWith("event: ")) {
              eventType = line.substring(7).trim();
            } else if (line.startsWith("data: ")) {
              dataStr = line.substring(6).trim();
            }
          }

          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);

              if (eventType === "progress" && data.step) {
                updateStep(data.step, data.status, data.message);
              } else if (eventType === "complete") {
                if (data.success) {
                  const saveResponse = await fetch(`${API_BASE}/setup`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                      apiToken: apiToken.trim(),
                      accountId: accountId.trim()
                    })
                  });

                  const saveData = await saveResponse.json();

                  if (
                    saveResponse.ok &&
                    saveData.success &&
                    saveData.data?.token
                  ) {
                    const { tokenStorage } = await import(
                      "@/lib/token-storage"
                    );
                    tokenStorage.setToken(saveData.data.token);
                    toast.success("Credentials configured successfully");
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    router.push(ROUTES.BUILDER);
                  } else {
                    toast.error(
                      saveData.message || "Failed to save credentials"
                    );
                    if (saveData.error === "Invalid credentials") {
                      setErrors({
                        apiToken: "Invalid API token or Account ID",
                        accountId: "Invalid API token or Account ID"
                      });
                    }
                  }
                }
              } else if (eventType === "error") {
                toast.error(data.message || "An error occurred");
                setErrors({
                  apiToken: data.message || "Setup failed",
                  accountId: data.message || "Setup failed"
                });
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      toast.error("An error occurred while configuring credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return { handleSubmit };
}

