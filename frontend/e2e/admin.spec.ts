import path from "node:path";
import { expect, test } from "@playwright/test";
import { adminLogin, trackConsoleErrors } from "./helpers";

test.describe("admin", () => {
  test("admin pages require login", async ({ page }) => {
    await page.goto("/admin/faculty");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Ffaculty/);
  });

  test("login rejects wrong password and accepts correct one", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("e2e-admin@example.edu");
    await page.getByLabel("Password").fill("definitely-wrong");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible();
    await adminLogin(page);
    await expect(page.getByRole("heading", { name: /Welcome, E2E Admin/ })).toBeVisible();
  });

  test("CRUD: created faculty appears publicly, edits reflect, archive hides", async ({ page, context }) => {
    const errors = trackConsoleErrors(page);
    await adminLogin(page);
    await page.goto("/admin/faculty/new");

    // client-side validation
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Please correct the highlighted fields below.")).toBeVisible();

    await page.getByLabel("Full name").fill("Dr. E2E Tester");
    await page.getByLabel("Designation").fill("Assistant Professor");
    await page.getByLabel("Specialization").fill("Software Testing");
    await page.getByLabel("Email", { exact: true }).fill("e2e.tester@example.edu");
    await page.getByLabel("Research interests").fill("Testing\nQuality");
    await page.getByLabel("Visibility").selectOption("PUBLISHED");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Faculty member created and published.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/faculty\/\d+$/);

    const pub = await context.newPage();
    await pub.goto("/faculty?profile=dr-e2e-tester");
    const profile = pub.getByRole("dialog", { name: "Dr. E2E Tester" });
    await expect(profile).toBeVisible();
    await expect(profile.getByText("Assistant Professor")).toBeVisible();

    // update designation -> reflects on the public site without code changes
    await page.getByLabel("Designation").fill("Associate Professor");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Faculty member saved and published.")).toBeVisible();
    await pub.reload();
    await expect(pub.getByRole("dialog", { name: "Dr. E2E Tester" }).getByText("Associate Professor")).toBeVisible();

    // archive from the list (with confirmation) -> hidden publicly
    await page.goto("/admin/faculty?q=E2E");
    await page.getByRole("button", { name: "Archive" }).first().click();
    await page.getByRole("button", { name: "Archive", exact: true }).last().click();
    await expect(page.getByText("Archived", { exact: true }).first()).toBeVisible();
    await pub.goto("/faculty?profile=dr-e2e-tester");
    await expect(pub.getByRole("dialog", { name: "Profile unavailable" })).toBeVisible();
    await expect(pub.getByRole("link", { name: /Dr\. E2E Tester/ })).toHaveCount(0);

    // audit log records the operations
    await page.goto("/admin/activity-logs");
    await expect(page.getByRole("cell", { name: "Dr. E2E Tester" }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("server-side validation errors are shown on fields", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/students/new");
    await page.getByLabel("Full name").fill("Dup Student");
    await page.getByLabel("Register number", { exact: false }).first().fill("SAMPLE001"); // already exists
    await page.getByLabel("Batch").fill("2023-2027");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText(/already exists/)).toBeVisible();
  });

  test("Excel import: preview, then confirm", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/excel/import?entity=students");
    await page.getByLabel("2. Choose the completed .xlsx file").setInputFiles(path.join(__dirname, "fixtures", "students.xlsx"));
    await page.getByLabel("3. New records should be").selectOption("PUBLISHED");
    await page.getByRole("button", { name: "Validate & preview" }).click();
    await expect(page.getByRole("button", { name: "New records: 1" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Invalid: 1" })).toBeVisible();
    await expect(page.getByText(/Register No: /)).toBeVisible();

    // nothing written before confirmation
    const before = await page.request.get("/api/v1/students?q=E2E%20Imported");
    expect((await before.json()).total).toBe(0);

    await page.getByRole("button", { name: /Confirm & apply 1 change/ }).click();
    await page.getByRole("button", { name: "Apply changes" }).click();
    await expect(page.getByText("Import complete: 1 created, 0 updated.")).toBeVisible();
    const after = await page.request.get("/api/v1/students?q=E2E%20Imported");
    expect((await after.json()).total).toBe(1);
  });

  test("Excel export downloads a filtered workbook", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/excel/export");
    await page.getByLabel("Records").selectOption("student_achievements");
    await page.getByLabel("Level").selectOption("National");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export to Excel" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^student_achievements_\d{8}\.xlsx$/);
  });

  test("department profile edit reflects on About page", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/department");
    await page.getByLabel("Tagline").fill("Excellence through E2E testing");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(/Department profile saved/)).toBeVisible();
    await page.goto("/");
    await expect(page.getByText("Excellence through E2E testing").first()).toBeVisible();
  });
});
