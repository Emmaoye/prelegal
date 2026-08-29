import { expect, test } from "@playwright/test";
import fs from "node:fs";
import { PDFParse } from "pdf-parse";

async function extractPdfText(filePath: string): Promise<string> {
  const parser = new PDFParse({ data: fs.readFileSync(filePath) });
  try {
    const result = await parser.getText();
    // Collapse line wraps and soft-hyphenation breaks introduced by the
    // PDF's own text layout - callers care whether content is present, not
    // where the page happened to wrap a line or hyphenate a long word.
    return result.text.replace(/-\s+/g, "").replace(/\s+/g, " ");
  } finally {
    await parser.destroy();
  }
}

async function fillCompleteForm(page: import("@playwright/test").Page) {
  await page.getByLabel("Legal name").nth(0).fill("Acme Robotics, Inc.");
  await page.getByLabel("Address").nth(0).fill("500 Market St, San Francisco, CA 94105");
  await page.getByLabel("Legal name").nth(1).fill("Beta Innovations LLC");
  await page.getByLabel("Address").nth(1).fill("200 Elm Ave, Austin, TX 73301");
  await page.getByLabel("Effective date").fill("2026-09-01");
  await page
    .getByLabel("Purpose of disclosure")
    .fill("evaluating a potential joint product integration");
  await page.getByLabel("Term (years)").fill("2");
  await page.getByLabel("Governing state").fill("Delaware");
}

test.describe("Mutual NDA Creator", () => {
  test.beforeEach(async ({ page }) => {
    // The NDA creator lives behind the fake login gate; seed a logged-in
    // user so these tests can focus on NDA behavior rather than login.
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "prelegal_user",
        JSON.stringify({ id: 1, email: "e2e@example.com" })
      );
    });
  });

  test("renders the empty form with placeholders and a disabled download button", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Mutual NDA Creator" })).toBeVisible();
    await expect(page.getByText("[Party A Name]")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download NDA as PDF" })
    ).toBeDisabled();
  });

  test("live preview reflects form input as the user types", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Legal name").nth(0).fill("Acme Robotics, Inc.");

    await expect(page.getByText("Acme Robotics, Inc.").first()).toBeVisible();
    await expect(page.getByText("[Party A Name]")).not.toBeVisible();
  });

  test("enables download only once every field is filled, and disables again if one is cleared", async ({
    page,
  }) => {
    await page.goto("/");
    const downloadButton = page.getByRole("button", { name: "Download NDA as PDF" });

    await fillCompleteForm(page);
    await expect(downloadButton).toBeEnabled();

    await page.getByLabel("Governing state").fill("");
    await expect(downloadButton).toBeDisabled();
  });

  test("does not enable download for a zero or negative term", async ({ page }) => {
    await page.goto("/");
    const downloadButton = page.getByRole("button", { name: "Download NDA as PDF" });

    await fillCompleteForm(page);
    await expect(downloadButton).toBeEnabled();

    await page.getByLabel("Term (years)").fill("0");
    await expect(downloadButton).toBeDisabled();

    await page.getByLabel("Term (years)").fill("-3");
    await expect(downloadButton).toBeDisabled();
  });

  test("downloads a PDF named mutual-nda.pdf whose content matches the form", async ({
    page,
  }) => {
    await page.goto("/");
    await fillCompleteForm(page);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download NDA as PDF" }).click(),
    ]);

    expect(download.suggestedFilename()).toBe("mutual-nda.pdf");
    const filePath = await download.path();
    expect(filePath).toBeTruthy();
    const stats = fs.statSync(filePath!);
    expect(stats.size).toBeGreaterThan(1000);

    const text = await extractPdfText(filePath!);
    expect(text).toContain("MUTUAL NON-DISCLOSURE AGREEMENT");
    expect(text).toContain("Acme Robotics, Inc.");
    expect(text).toContain("500 Market St, San Francisco, CA 94105");
    expect(text).toContain("Beta Innovations LLC");
    expect(text).toContain("200 Elm Ave, Austin, TX 73301");
    expect(text).toContain("September 1, 2026");
    expect(text).toContain("evaluating a potential joint product integration");
    expect(text).toContain("2 year(s)");
    expect(text).toContain("State of Delaware");
  });

  test("handles very long party names and addresses without erroring", async ({ page }) => {
    await page.goto("/");
    const longName = "A".repeat(200);
    const longAddress = "1 Some Very Long Street Name Avenue, ".repeat(10);

    await page.getByLabel("Legal name").nth(0).fill(longName);
    await page.getByLabel("Address").nth(0).fill(longAddress);

    await expect(page.getByText(longName, { exact: true }).first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("undefined");
  });

  test("Cyrillic/Greek party names render correctly in both the preview and the downloaded PDF", async ({
    page,
  }) => {
    await page.goto("/");
    await fillCompleteForm(page);
    await page.getByLabel("Legal name").nth(0).fill("ООО Ромашка");
    await page.getByLabel("Legal name").nth(1).fill("Ελληνική Εταιρεία");

    await expect(page.getByText("ООО Ромашка").first()).toBeVisible();
    await expect(page.getByText("Ελληνική Εταιρεία").first()).toBeVisible();
    await expect(
      page.getByText(
        "Some characters you entered may not display correctly in the downloaded PDF"
      )
    ).not.toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download NDA as PDF" }).click(),
    ]);
    const text = await extractPdfText((await download.path())!);
    expect(text).toContain("ООО Ромашка");
    expect(text).toContain("Ελληνική Εταιρεία");
  });

  test("warns (without blocking download) when the PDF font can't render a character, e.g. CJK", async ({
    page,
  }) => {
    await page.goto("/");
    await fillCompleteForm(page);
    await page.getByLabel("Legal name").nth(0).fill("北京示例有限公司");

    await expect(page.getByText("北京示例有限公司").first()).toBeVisible();
    await expect(
      page.getByText(
        "Some characters you entered may not display correctly in the downloaded PDF"
      )
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Download NDA as PDF" })).toBeEnabled();
  });

  test("stays usable and free of horizontal overflow on a mobile viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Mutual NDA Creator" })).toBeVisible();

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
