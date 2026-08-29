import { expect, test } from "@playwright/test";

test.describe("History", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: 1, email: "e2e@example.com" }),
      });
    });
  });

  test("shows an empty state when there is no saved history", async ({ page }) => {
    await page.route("**/api/documents", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });

    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
    await expect(page.getByText(/haven't generated any documents/i)).toBeVisible();
  });

  test("lists saved documents and previews the selected one, with a download available", async ({ page }) => {
    await page.route("**/api/documents", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "conversation-1",
            documentType: "mutual_nda",
            documentName: "Mutual NDA",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ]),
      });
    });
    await page.route("**/api/documents/conversation-1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "conversation-1",
          documentType: "mutual_nda",
          documentName: "Mutual NDA",
          updatedAt: "2026-01-01T00:00:00Z",
          fields: { party_a_name: "Acme Robotics, Inc." },
          document: {
            slug: "mutual_nda",
            name: "Mutual Non-Disclosure Agreement",
            blocks: [
              {
                level: 0,
                marker: "",
                heading: "Parties",
                runs: [
                  { type: "text", text: "This Agreement is entered into by and between " },
                  {
                    type: "field",
                    key: "party_a_name",
                    label: "Your organization's name",
                    value: "Acme Robotics, Inc.",
                  },
                  { type: "text", text: " and " },
                  { type: "field", key: "party_b_name", label: "The other party's name", value: "" },
                  { type: "text", text: "." },
                ],
              },
            ],
          },
        }),
      });
    });

    await page.goto("/history");

    await expect(page.getByText("Mutual NDA")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mutual Non-Disclosure Agreement" })).toBeVisible();
    await expect(page.getByText("Acme Robotics, Inc.").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download Mutual Non-Disclosure Agreement as PDF" })
    ).toBeEnabled();
  });

  test("is reachable from the document creator's navigation", async ({ page }) => {
    await page.route("**/api/documents", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });

    await page.goto("/");
    await page.getByRole("link", { name: "History" }).click();

    await expect(page).toHaveURL(/\/history\/?$/);
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
  });
});
