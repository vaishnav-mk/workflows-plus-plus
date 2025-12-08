const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8787";

export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function waitForApi(
  maxAttempts = 10,
  delayMs = 1000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkApiHealth()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  throw new Error(
    `API at ${API_BASE_URL} is not responding. Please start the backend with: cd workflows-backend && npm run dev`
  );
}
