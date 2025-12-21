import { apiClient } from "./api-client";

export async function logout(): Promise<void> {
  try {
    await apiClient.logout();
  } catch (error) {
    console.error("Logout failed:", error);
  } finally {
    if (typeof window !== "undefined") {
      window.location.href = "/setup";
    }
  }
}
