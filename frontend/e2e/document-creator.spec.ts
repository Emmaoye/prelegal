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

type Fields = Record<string, string>;

const completeFields: Fields = {
  party_a_name: "Acme Robotics, Inc.",
  party_b_name: "Beta Innovations LLC",
  purpose: "evaluating a potential joint product integration",
  effective_date: "2026-09-01",
  governing_law: "Delaware",
};

// Mirrors the shape app.document_chat.render_document produces for the real
// Mutual NDA template: a synthesized "Parties" block plus a couple of the
// template's own placeholder fields, enough to exercise substitution,
// bracket fallbacks, and PDF rendering without depending on the full
// 11-clause template text.
function buildDocument(fields: Fields) {
  const value = (key: string) => fields[key] ?? "";
  return {
    slug: "mutual_nda",
    name: "Mutual Non-Disclosure Agreement",
    blocks: [
      {
        level: 0,
        marker: "",
        heading: "Parties",
        runs: [
          { type: "text", text: "This Agreement is entered into by and between " },
          { type: "field", key: "party_a_name", label: "Your organization's name", value: value("party_a_name") },
          { type: "text", text: " and " },
          { type: "field", key: "party_b_name", label: "The other party's name", value: value("party_b_name") },
          { type: "text", text: "." },
        ],
      },
      {
        level: 0,
        marker: "1.",
        heading: "Introduction",
        runs: [
          { type: "text", text: "This agreement covers the " },
          { type: "field", key: "purpose", label: "Purpose", value: value("purpose") },
          { type: "text", text: ", effective " },
          { type: "field", key: "effective_date", label: "Effective Date", value: value("effective_date") },
          { type: "text", text: ", governed by the laws of " },
          { type: "field", key: "governing_law", label: "Governing Law", value: value("governing_law") },
          { type: "text", text: "." },
        ],
      },
    ],
  };
}

interface ChatTurnResponse {
  reply: string;
  fields: Fields;
  documentType?: string | null;
}

// Queues up canned /api/chat/message responses (mocked so these tests are
// deterministic and don't depend on a real OPENROUTER_API_KEY/network
// call); each chat turn consumes the next response in order, repeating the
// last one if the test sends more turns than were queued.
async function mockChatResponses(page: Page, responses: ChatTurnResponse[]) {
  let call = 0;
  await page.route("**/api/chat/message", async (route) => {
    const turn = responses[Math.min(call, responses.length - 1)];
    call++;
    const documentType = turn.documentType === undefined ? "mutual_nda" : turn.documentType;
    await route.fulfill({
      json: {
        reply: turn.reply,
        fields: turn.fields,
        documentType,
        documentName: documentType ? "Mutual Non-Disclosure Agreement" : null,
        document: documentType ? buildDocument(turn.fields) : null,
      },
    });
  });
}

async function sendChatMessage(page: Page, text: string) {
  await page.getByLabel("Message").fill(text);
  await page.getByRole("button", { name: "Send" }).click();
}

test.describe("Document Creator", () => {
  test.beforeEach(async ({ page }) => {
    // The document creator lives behind the fake login gate; seed a
    // logged-in user so these tests can focus on chat/document behavior
    // rather than login.
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "prelegal_user",
        JSON.stringify({ id: 1, email: "e2e@example.com" })
      );
    });
  });

  test("renders a generic greeting and no download button before a document type is confirmed", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Document Creator" })).toBeVisible();
    await expect(page.getByText(/what kind of legal document/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /download/i })).toHaveCount(0);
  });

  test("confirms a document type from a freeform request and shows the download button", async ({ page }) => {
    await mockChatResponses(page, [{ reply: "Great, let's build your NDA.", fields: {} }]);
    await page.goto("/");
    await sendChatMessage(page, "I need an NDA to protect confidential info with a partner");

    await expect(page.getByText("Great, let's build your NDA.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Mutual Non-Disclosure Agreement" }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download Mutual Non-Disclosure Agreement as PDF" })
    ).toBeEnabled();
  });

  test("live preview reflects fields returned by the chat and brackets what's still missing", async ({ page }) => {
    await mockChatResponses(page, [
      { reply: "Got it, what's the other party's name?", fields: { party_a_name: "Acme Robotics, Inc." } },
    ]);
    await page.goto("/");
    await sendChatMessage(page, "We're Acme Robotics, Inc. and need an NDA.");

    await expect(page.getByText("Got it, what's the other party's name?")).toBeVisible();
    await expect(page.getByText("Acme Robotics, Inc.").first()).toBeVisible();
    await expect(page.getByText("[The other party's name]")).toBeVisible();
  });

  test("keeps the download button enabled even with fields still missing", async ({ page }) => {
    await mockChatResponses(page, [
      { reply: "Got it, what else can you tell me?", fields: { party_a_name: "Acme Robotics, Inc." } },
    ]);
    await page.goto("/");
    await sendChatMessage(page, "We're Acme Robotics, Inc.");

    await expect(page.getByText("Got it, what else can you tell me?")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download Mutual Non-Disclosure Agreement as PDF" })
    ).toBeEnabled();
  });

  test("returns focus to the message input after each response", async ({ page }) => {
    await mockChatResponses(page, [{ reply: "Got it.", fields: {} }]);
    await page.goto("/");
    await sendChatMessage(page, "I need an NDA");

    await expect(page.getByText("Got it.")).toBeVisible();
    await expect(page.getByLabel("Message")).toBeFocused();
  });

  test("downloads a PDF named after the document's slug whose content matches the chat-provided fields", async ({
    page,
  }) => {
    await mockChatResponses(page, [{ reply: "All set!", fields: completeFields }]);
    await page.goto("/");
    await sendChatMessage(page, "Here are all the details.");
    await expect(page.getByText("All set!")).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download Mutual Non-Disclosure Agreement as PDF" }).click(),
    ]);

    expect(download.suggestedFilename()).toBe("mutual_nda.pdf");
    const filePath = await download.path();
    expect(filePath).toBeTruthy();
    const stats = fs.statSync(filePath!);
    expect(stats.size).toBeGreaterThan(1000);

    const text = await extractPdfText(filePath!);
    expect(text).toContain("MUTUAL NON-DISCLOSURE AGREEMENT");
    expect(text).toContain("Acme Robotics, Inc.");
    expect(text).toContain("Beta Innovations LLC");
    expect(text).toContain("evaluating a potential joint product integration");
    expect(text).toContain("Delaware");
  });

  test("handles very long party names without erroring", async ({ page }) => {
    const longName = "A".repeat(200);
    await mockChatResponses(page, [
      { reply: "Got it.", fields: { ...completeFields, party_a_name: longName } },
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
        fields: { ...completeFields, party_a_name: "ООО Ромашка", party_b_name: "Ελληνική Εταιρεία" },
      },
    ]);
    await page.goto("/");
    await sendChatMessage(page, "Here are all the details.");
    await expect(page.getByText("All set!")).toBeVisible();

    await expect(page.getByText("ООО Ромашка").first()).toBeVisible();
    await expect(page.getByText("Ελληνική Εταιρεία").first()).toBeVisible();
    await expect(
      page.getByText("Some characters you entered may not display correctly in the downloaded PDF")
    ).not.toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download Mutual Non-Disclosure Agreement as PDF" }).click(),
    ]);
    const text = await extractPdfText((await download.path())!);
    expect(text).toContain("ООО Ромашка");
    expect(text).toContain("Ελληνική Εταιρεία");
  });

  test("warns (without blocking download) when the PDF font can't render a character, e.g. CJK", async ({
    page,
  }) => {
    await mockChatResponses(page, [
      { reply: "All set!", fields: { ...completeFields, party_a_name: "北京示例有限公司" } },
    ]);
    await page.goto("/");
    await sendChatMessage(page, "Here are all the details.");
    await expect(page.getByText("All set!")).toBeVisible();

    await expect(page.getByText("北京示例有限公司").first()).toBeVisible();
    await expect(
      page.getByText("Some characters you entered may not display correctly in the downloaded PDF")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download Mutual Non-Disclosure Agreement as PDF" })
    ).toBeEnabled();
  });

  test("stays usable and free of horizontal overflow on a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Document Creator" })).toBeVisible();

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
