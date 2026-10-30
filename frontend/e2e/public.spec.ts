import { expect, test } from "@playwright/test";
import { gotoReady, trackConsoleErrors } from "./helpers";

test.describe("public website", () => {
  test("homepage shows database-driven content", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await gotoReady(page, "/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Department of Computer Science");
    const stats = page.getByLabel("Department at a glance");
    await expect(stats.getByText("Faculty", { exact: true })).toBeVisible();
    await expect(stats.getByText("Achievements", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Programme Objectives/ })).toBeVisible();
    // About content lives on the home page; the HOD message is not shown
    await expect(page.getByRole("heading", { name: "About the Department" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Vision" })).toBeVisible();
    await expect(page.getByText("Message from the Head of the Department")).toHaveCount(0);
    await expect(page).toHaveTitle(/Department of Computer Science/);
    expect(errors).toEqual([]);
  });

  test("faculty browsing: list, search, profile", async ({ page }) => {
    await gotoReady(page, "/faculty");
    await expect(page.getByRole("heading", { name: "Our Faculty" })).toBeVisible();
    await expect(page.getByText(/\d+ faculty members found/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Dr\. Sample Professor/ })).toBeVisible();
    // no filter panel; filters in the URL (menu links) still apply
    await gotoReady(page, "/faculty?q=security");
    await expect(page.getByText("1 faculty member found")).toBeVisible();
    // profile opens as a popup on the same page
    await page.getByRole("link", { name: /Dr\. Sample Associate/ }).click();
    const dialog = page.getByRole("dialog", { name: "Dr. Sample Associate" });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/faculty\?.*profile=dr-sample-associate/);
    await expect(dialog.getByText("Associate Professor").first()).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Achievements" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Patents (summary)" })).toHaveCount(0); // empty sections hidden
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page).not.toHaveURL(/profile=/);
    // a shared profile link opens the popup directly; old profile URLs redirect to it
    await gotoReady(page, "/faculty/dr-sample-professor");
    await expect(page.getByRole("dialog", { name: "Dr. Sample Professor" })).toBeVisible();
  });

  test("achievement browsing (URL filters, no filter panel)", async ({ page }) => {
    await gotoReady(page, "/student-achievements");
    await expect(page.getByText("2 achievements found")).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply filters" })).toHaveCount(0);
    await gotoReady(page, "/student-achievements?level=National");
    await expect(page.getByText("1 achievement found")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Winner: Smart India Hackathon (sample)" })).toBeVisible();
    await gotoReady(page, "/student-achievements?level=National&category=Paper%20Presentations");
    await expect(page.getByText("No achievements found.")).toBeVisible();

    await gotoReady(page, "/faculty-achievements");
    await expect(page.getByText("Funded project on IoT security (sample)")).toBeVisible();
  });

  test("event filtering: upcoming, past, type", async ({ page }) => {
    await gotoReady(page, "/events");
    await expect(page.getByText("Workshop on Generative AI (sample)")).toBeVisible();
    await expect(page.getByText("Guest Lecture on Cloud Computing (sample)")).toHaveCount(0);
    await page.getByRole("link", { name: "Past" }).click();
    await expect(page).toHaveURL(/when=past/);
    await expect(page.getByText("Guest Lecture on Cloud Computing (sample)")).toBeVisible();
    await page.getByRole("link", { name: "All", exact: true }).click();
    await expect(page).toHaveURL(/when=all/);
    await gotoReady(page, "/events?when=all&event_type=Workshop");
    await expect(page.getByText("1 event found")).toBeVisible();
    await page.getByRole("link", { name: "Workshop on Generative AI (sample)" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Workshop on Generative AI (sample)");
  });

  test("opportunity hub server-side filters", async ({ page }) => {
    await gotoReady(page, "/opportunities");
    await expect(page.getByText("Sample National Hackathon")).toBeVisible();
    await gotoReady(page, "/opportunities?state=Tamil%20Nadu&category=Hackathon");
    await expect(page.getByText("1 opportunity found")).toBeVisible();
    await gotoReady(page, "/opportunities?registration=CLOSED");
    await expect(page.getByText("No opportunities found.")).toBeVisible();
  });

  test("research browsing", async ({ page }) => {
    await gotoReady(page, "/research");
    await expect(page.getByRole("heading", { name: "Research Repository" })).toBeVisible();
    await expect(page.getByText("A sample study on deep learning")).toBeVisible();
    await expect(page.getByRole("link", { name: "AI & Machine Learning Laboratory" })).toBeVisible();
    await page.getByRole("link", { name: "Patents", exact: true }).click();
    await expect(page).toHaveURL(/tab=patents/);
    await expect(page.getByText("No records found.")).toBeVisible();
    await page.getByRole("link", { name: "Publications", exact: true }).click();
    await expect(page).toHaveURL(/tab=publications/);
    await expect(page.getByText("1 publication found")).toBeVisible();
  });

  test("global search and 404 page", async ({ page }) => {
    await page.goto("/search?q=hackathon");
    await expect(page.getByRole("heading", { name: /Student Achievements/ })).toBeVisible();
    const res = await page.goto("/events/does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "We couldn’t find that page" })).toBeVisible();
  });

  test("main navigation has no broken links", async ({ page, request }) => {
    await gotoReady(page, "/");
    const hrefs = await page.locator("header a[href^='/'], footer a[href^='/']").evaluateAll((els) =>
      Array.from(new Set(els.map((e) => (e as HTMLAnchorElement).getAttribute("href")!))),
    );
    // dropdown links are rendered on demand; include the known structure
    const all = new Set([...hrefs, "/student-achievements", "/faculty-achievements", "/research", "/laboratories", "/projects", "/events", "/opportunities", "/news", "/gallery", "/placements", "/internships", "/alumni", "/academics", "/gallery?tab=videos", "/events?group=workshops-seminars", "/student-achievements?group=competitions"]);
    for (const href of all) {
      const r = await request.get(href);
      expect(r.status(), href).toBe(200);
    }
  });
});
