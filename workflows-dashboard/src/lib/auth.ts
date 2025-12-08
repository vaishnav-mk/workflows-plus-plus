import { apiClient } from "./api-client";

export async function logout(): Promise<void> {
  try {
    await apiClient.logout();
    if (typeof window !== "undefined") {
      window.location.href = "/setup";
    }
  } catch (error) {
    console.error("Logout failed:", error);
    if (typeof window !== "undefined") {
      window.location.href = "/setup";
    }
  }
}
