import { expect, test } from "@playwright/test";

test.describe("Login gate", () => {
  test("redirects an unauthenticated visitor from / to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login\/?$/);
    await expect(page.getByRole("heading", { name: "Prelegal" })).toBeVisible();
  });

  test("signs up, lands on the document creator, and can log out", async ({ page }) => {
    let authenticated = false;
    const email = "new@example.com";

    await page.route("**/api/auth/signup", async (route) => {
      authenticated = true;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: 1, email }),
      });
    });
    await page.route("**/api/auth/me", async (route) => {
      if (authenticated) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: 1, email }) });
      } else {
        await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "Not authenticated" }) });
      }
    });
    await page.route("**/api/auth/logout", async (route) => {
      authenticated = false;
      await route.fulfill({ status: 204, body: "" });
    });

    await page.goto("/login");
    await page.getByRole("button", { name: "Switch to sign up" }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("hunter2");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Document Creator" })).toBeVisible();
    await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login\/?$/);
  });

  test("signing in with an incorrect password shows an error and does not navigate", async ({ page }) => {
    await page.route("**/api/auth/signin", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Incorrect email or password" }),
      });
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("hunter2");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page.getByText("Incorrect email or password")).toBeVisible();
    await expect(page).toHaveURL(/\/login\/?$/);
  });
});
