
import { execSync } from "child_process";
import { waitForApi } from "./health-check";
import path from "path";

export default async function setup() {
  console.log("Checking if API is running at http://localhost:8787...");
  try {
    await waitForApi(5, 2000);
    console.log("✓ API is running and ready for tests");
  } catch (error) {
    execSync("npm run dev", {
      cwd: path.join(__dirname, "../../workflows-backend")
    });
    await waitForApi(5, 2000);
  }
}
