import { expect, test } from "@playwright/test";
import { adminLogin, expectNoHorizontalOverflow } from "./helpers";

const PAGES = [
  "/", "/faculty", "/faculty?profile=dr-sample-professor", "/students", "/student-achievements",
  "/faculty-achievements", "/events", "/opportunities", "/placements", "/internships", "/research",
  "/laboratories", "/projects", "/alumni", "/news", "/gallery", "/gallery?tab=videos", "/academics", "/contact",
  "/search?q=sample",
];

test("public pages have no horizontal overflow on mobile", async ({ page }) => {
  for (const p of PAGES) {
    await page.goto(p);
    await expectNoHorizontalOverflow(page);
  }
});

test("mobile navigation menu works", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const nav = page.getByRole("navigation", { name: "Mobile" });
  await expect(nav).toBeVisible();
  // menu groups are collapsed until opened
  await nav.getByText("Placements", { exact: true }).click();
  await nav.getByRole("link", { name: "Placements overview" }).click();
  await expect(page).toHaveURL(/\/placements$/);
  await expect(page.getByRole("heading", { level: 1, name: "Placements" })).toBeVisible();
});

test("admin dashboard is usable on mobile", async ({ page }) => {
  await adminLogin(page);
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "Faculty", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Faculty" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
