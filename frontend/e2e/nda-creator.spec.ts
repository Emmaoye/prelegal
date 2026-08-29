import { expect, Page, test } from "@playwright/test";
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

interface NdaFieldsWire {
  partyA: { name: string; address: string };
  partyB: { name: string; address: string };
  effectiveDate: string;
  purpose: string;
  termYears: string;
  governingState: string;
}

const completeFields: NdaFieldsWire = {
  partyA: { name: "Acme Robotics, Inc.", address: "500 Market St, San Francisco, CA 94105" },
  partyB: { name: "Beta Innovations LLC", address: "200 Elm Ave, Austin, TX 73301" },
  effectiveDate: "2026-09-01",
  purpose: "evaluating a potential joint product integration",
  termYears: "2",
  governingState: "Delaware",
};

// Queues up canned /api/nda-chat/message responses (mocked so these tests
// are deterministic and don't depend on a real OPENROUTER_API_KEY/network
// call); each chat turn consumes the next response in order, repeating the
// last one if the test sends more turns than were queued.
async function mockChatResponses(
  page: Page,
  responses: { reply: string; fields: NdaFieldsWire }[]
) {
  let call = 0;
  await page.route("**/api/nda-chat/message", async (route) => {
    const response = responses[Math.min(call, responses.length - 1)];
    call++;
    await route.fulfill({ json: response });
  });
}

async function sendChatMessage(page: Page, text: string) {
  await page.getByLabel("Message").fill(text);
  await page.getByRole("button", { name: "Send" }).click();
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

  test("renders the chat greeting and a disabled download button before any fields are known", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Mutual NDA Creator" })).toBeVisible();
    await expect(page.getByText("[Party A Name]")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download NDA as PDF" })
    ).toBeDisabled();
  });

  test("live preview reflects fields returned by the chat", async ({ page }) => {
    await mockChatResponses(page, [
      {
        reply: "Got it, what's Party B's name?",
        fields: { ...completeFields, partyB: { name: "", address: "" } },
      },
    ]);
    await page.goto("/");
    await sendChatMessage(page, "Party A is Acme Robotics, Inc.");

    await expect(page.getByText("Got it, what's Party B's name?")).toBeVisible();
    await expect(page.getByText("Acme Robotics, Inc.").first()).toBeVisible();
    await expect(page.getByText("[Party A Name]")).not.toBeVisible();
  });

  test("enables download only once every field is known, and disables again if a later reply regresses one", async ({
    page,
  }) => {
    await mockChatResponses(page, [
      { reply: "All set!", fields: completeFields },
      { reply: "Sure, what's the new governing state?", fields: { ...completeFields, governingState: "" } },
    ]);
    await page.goto("/");
    const downloadButton = page.getByRole("button", { name: "Download NDA as PDF" });

    await sendChatMessage(page, "Here are all the details.");
    await expect(page.getByText("All set!")).toBeVisible();
    await expect(downloadButton).toBeEnabled();

    await sendChatMessage(page, "Actually, let's change the governing state.");
    await expect(page.getByText("Sure, what's the new governing state?")).toBeVisible();
    await expect(downloadButton).toBeDisabled();
  });

  test("does not enable download for a zero or negative term", async ({ page }) => {
    await mockChatResponses(page, [
      { reply: "Zero years, got it.", fields: { ...completeFields, termYears: "0" } },
    ]);
    await page.goto("/");
    const downloadButton = page.getByRole("button", { name: "Download NDA as PDF" });

    await sendChatMessage(page, "Make the term zero years.");
    await expect(page.getByText("Zero years, got it.")).toBeVisible();
    await expect(downloadButton).toBeDisabled();
  });

  test("downloads a PDF named mutual-nda.pdf whose content matches the chat-provided fields", async ({
    page,
  }) => {
    await mockChatResponses(page, [{ reply: "All set!", fields: completeFields }]);
    await page.goto("/");
    await sendChatMessage(page, "Here are all the details.");
    await expect(page.getByText("All set!")).toBeVisible();

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
    const longName = "A".repeat(200);
    const longAddress = "1 Some Very Long Street Name Avenue, ".repeat(10);
    await mockChatResponses(page, [
      {
        reply: "Got it.",
        fields: {
          ...completeFields,
          partyA: { name: longName, address: longAddress },
        },
      },
    ]);
    await page.goto("/");
    await sendChatMessage(page, "Party A's name is very long.");

    await expect(page.getByText("Got it.")).toBeVisible();
    await expect(page.getByText(longName, { exact: true }).first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("undefined");
  });

  test("Cyrillic/Greek party names render correctly in both the preview and the downloaded PDF", async ({
    page,
  }) => {
    await mockChatResponses(page, [
      {
        reply: "All set!",
        fields: {
          ...completeFields,
          partyA: { ...completeFields.partyA, name: "ООО Ромашка" },
          partyB: { ...completeFields.partyB, name: "Ελληνική Εταιρεία" },
        },
      },
    ]);
    await page.goto("/");
    await sendChatMessage(page, "Here are all the details.");
    await expect(page.getByText("All set!")).toBeVisible();

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
    await mockChatResponses(page, [
      {
        reply: "All set!",
        fields: {
          ...completeFields,
          partyA: { ...completeFields.partyA, name: "北京示例有限公司" },
        },
      },
    ]);
    await page.goto("/");
    await sendChatMessage(page, "Here are all the details.");
    await expect(page.getByText("All set!")).toBeVisible();

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
