import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HistoryPage from "./page";
import * as documentsApi from "@/lib/documents-api";
import { DocumentDetail, DocumentSummary } from "@/lib/documents-api";
import { RenderedDocument } from "@/lib/document-types";

vi.mock("@react-pdf/renderer", () => ({
  pdf: vi.fn(() => ({ toBlob: vi.fn().mockResolvedValue(new Blob()) })),
  Document: "mock-document",
  Page: "mock-page",
  Text: "mock-text",
  View: "mock-view",
  Link: "mock-link",
  StyleSheet: { create: (styles: unknown) => styles },
  Font: { register: vi.fn() },
}));

const document: RenderedDocument = {
  slug: "mutual_nda",
  name: "Mutual Non-Disclosure Agreement",
  blocks: [],
};

const summaries: DocumentSummary[] = [
  { id: "conversation-1", documentType: "mutual_nda", documentName: "Mutual NDA", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "conversation-2", documentType: "csa", documentName: "Cloud Service Agreement", updatedAt: "2026-01-02T00:00:00Z" },
];

const firstDetail: DocumentDetail = {
  ...summaries[0],
  fields: { party_a_name: "Acme" },
  document,
};

describe("History page", () => {
  beforeEach(() => {
    vi.spyOn(documentsApi, "listDocuments").mockResolvedValue(summaries);
    vi.spyOn(documentsApi, "getDocument").mockResolvedValue(firstDetail);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists saved documents and previews the first one by default", async () => {
    render(<HistoryPage />);
    expect(await screen.findByText("Mutual NDA")).toBeInTheDocument();
    expect(screen.getByText("Cloud Service Agreement")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Mutual Non-Disclosure Agreement" })).toBeInTheDocument();
  });

  it("shows an empty state when there is no history yet", async () => {
    (documentsApi.listDocuments as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    render(<HistoryPage />);
    expect(await screen.findByText(/haven't generated any documents/i)).toBeInTheDocument();
  });

  it("switches the preview when selecting a different document", async () => {
    const secondDetail: DocumentDetail = {
      ...summaries[1],
      fields: {},
      document: { ...document, slug: "csa", name: "Cloud Service Agreement" },
    };
    (documentsApi.getDocument as ReturnType<typeof vi.fn>).mockImplementation((id: string) =>
      Promise.resolve(id === "conversation-2" ? secondDetail : firstDetail)
    );

    const user = userEvent.setup();
    render(<HistoryPage />);
    await screen.findByRole("heading", { name: "Mutual Non-Disclosure Agreement" });

    await user.click(screen.getByText("Cloud Service Agreement"));
    expect(await screen.findByRole("heading", { name: "Cloud Service Agreement" })).toBeInTheDocument();
  });
});
