import { expect, test } from "@playwright/test";

test.describe("Fake login gate", () => {
  test("redirects an unauthenticated visitor from / to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login\/?$/);
    await expect(page.getByRole("heading", { name: "Prelegal" })).toBeVisible();
  });

  test("signs up, lands on the document creator, and can log out", async ({ page }) => {
    await page.route("**/api/auth/signup", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: 1, email: "new@example.com" }),
      });
    });

    await page.goto("/login");
    await page.getByRole("button", { name: "Switch to sign up" }).click();
    await page.getByLabel("Email").fill("new@example.com");
    await page.getByLabel("Password").fill("hunter2");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Document Creator" })).toBeVisible();
    await expect(page.getByText("Signed in as new@example.com")).toBeVisible();

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login\/?$/);
  });

  test("signing in with an unknown email shows an error and does not navigate", async ({
    page,
  }) => {
    await page.route("**/api/auth/signin", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ detail: "No account found for this email" }),
      });
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("hunter2");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page.getByText("No account found for this email")).toBeVisible();
    await expect(page).toHaveURL(/\/login\/?$/);
  });
});
