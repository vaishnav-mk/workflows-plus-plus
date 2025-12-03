import { apiClient } from "./api-client";

export async function logout(): Promise<void> {
  try {
    await apiClient.logout();
    // Redirect to setup page after logout
    if (typeof window !== "undefined") {
      window.location.href = "/setup";
    }
  } catch (error) {
    console.error("Logout failed:", error);
    // Still redirect even if API call fails
    if (typeof window !== "undefined") {
      window.location.href = "/setup";
    }
  }
}

