import { defineConfig, devices } from "@playwright/test";

// E2E runs against an isolated stack: a throwaway SQLite database (migrated + sample data)
// on port 8001 and a production build of the frontend on port 3001.
const API_PORT = 8001;
const WEB_PORT = 3001;
export const E2E_ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@example.edu",
  password: process.env.E2E_ADMIN_PASSWORD ?? "e2e-only-password-123",
};
const python = process.env.E2E_PYTHON ?? (process.platform === "win32" ? ".venv\\Scripts\\python.exe" : ".venv/bin/python");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /responsive\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: [
    {
      command: `${python} -m scripts.e2e_server --port ${API_PORT}`,
      cwd: "../backend",
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      env: { E2E_ADMIN_EMAIL: E2E_ADMIN.email, E2E_ADMIN_PASSWORD: E2E_ADMIN.password },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npx next build && npx next start -p ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}/admin/login`,
      env: { API_URL: `http://127.0.0.1:${API_PORT}`, SITE_URL: `http://localhost:${WEB_PORT}`, NEXT_DIST_DIR: ".next-e2e" },
      reuseExistingServer: false,
      timeout: 600_000,
    },
  ],
});
