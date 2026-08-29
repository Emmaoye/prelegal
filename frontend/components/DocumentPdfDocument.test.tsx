import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DocumentPdfDocument from "./DocumentPdfDocument";
import { RenderedDocument } from "@/lib/document-types";

// react-pdf's primitives (Document/Page/Text/View/Link) aren't real DOM
// elements - stub them as plain tag names so this component's own run/field
// rendering logic can be exercised with React Testing Library, the same
// pattern DownloadDocumentButton.test.tsx uses.
vi.mock("@react-pdf/renderer", () => ({
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
  blocks: [
    {
      level: 0,
      marker: "1.",
      heading: "Introduction",
      runs: [
        { type: "text", text: "In connection with the " },
        { type: "field", key: "purpose", label: "Purpose", value: "" },
        { type: "text", text: ". See the " },
        { type: "link", text: "standard terms", href: "https://example.com/terms" },
        { type: "text", text: " for more.", bold: true },
      ],
    },
  ],
};

describe("DocumentPdfDocument", () => {
  it("renders the document title", () => {
    render(<DocumentPdfDocument document={document} fields={{}} />);
    expect(screen.getByText("MUTUAL NON-DISCLOSURE AGREEMENT")).toBeInTheDocument();
  });

  it("brackets an unfilled field and substitutes a filled one", () => {
    const { rerender } = render(<DocumentPdfDocument document={document} fields={{}} />);
    expect(screen.getByText("[Purpose]")).toBeInTheDocument();

    const filledDocument: RenderedDocument = {
      ...document,
      blocks: [
        {
          ...document.blocks[0],
          runs: document.blocks[0].runs.map((run) =>
            run.type === "field" ? { ...run, value: "Evaluating a partnership" } : run
          ),
        },
      ],
    };
    rerender(<DocumentPdfDocument document={filledDocument} fields={{}} />);
    expect(screen.getByText("Evaluating a partnership")).toBeInTheDocument();
  });

  it("renders a link run's text", () => {
    render(<DocumentPdfDocument document={document} fields={{}} />);
    expect(screen.getByText("standard terms")).toBeInTheDocument();
  });

  it("renders the signature block with party names", () => {
    render(
      <DocumentPdfDocument
        document={document}
        fields={{ party_a_name: "Acme Robotics, Inc.", party_b_name: "Beta Innovations LLC" }}
      />
    );
    expect(screen.getByText("Acme Robotics, Inc.")).toBeInTheDocument();
    expect(screen.getByText("Beta Innovations LLC")).toBeInTheDocument();
  });

  it("falls back to generic party labels when names are unknown", () => {
    render(<DocumentPdfDocument document={document} fields={{}} />);
    expect(screen.getByText("Party A")).toBeInTheDocument();
    expect(screen.getByText("Party B")).toBeInTheDocument();
  });
});
