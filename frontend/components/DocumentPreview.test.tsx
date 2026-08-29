import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import DocumentPreview from "./DocumentPreview";
import { RenderedDocument } from "@/lib/document-types";
import { DOCUMENT_DISCLAIMER } from "@/lib/document-render";

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
        { type: "text", text: "." },
      ],
    },
  ],
};

describe("DocumentPreview", () => {
  it("shows a placeholder message when no document is selected yet", () => {
    render(<DocumentPreview document={null} fields={{}} />);
    expect(screen.getByText(/create to see a preview/i)).toBeInTheDocument();
  });

  it("renders the document title and disclaimer once a document exists", () => {
    render(<DocumentPreview document={document} fields={{}} />);
    expect(screen.getByRole("heading", { name: "Mutual Non-Disclosure Agreement" })).toBeInTheDocument();
    expect(screen.getByText(DOCUMENT_DISCLAIMER)).toBeInTheDocument();
  });

  it("shows a bracketed placeholder for an unfilled field", () => {
    render(<DocumentPreview document={document} fields={{}} />);
    expect(screen.getByText("[Purpose]")).toBeInTheDocument();
  });

  it("substitutes a known field value inline", () => {
    // The backend bakes the collected field values directly into each
    // FieldRun's `value` before sending the rendered document - the
    // frontend just displays whatever value is already there.
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
    render(<DocumentPreview document={filledDocument} fields={{}} />);
    expect(screen.getByText("Evaluating a partnership")).toBeInTheDocument();
    expect(screen.queryByText("[Purpose]")).not.toBeInTheDocument();
  });

  it("shows placeholder party names in the signature block when empty", () => {
    render(<DocumentPreview document={document} fields={{}} />);
    expect(screen.getByText("Party A")).toBeInTheDocument();
    expect(screen.getByText("Party B")).toBeInTheDocument();
  });

  it("shows real party names in the signature block once filled in", () => {
    render(
      <DocumentPreview
        document={document}
        fields={{ party_a_name: "Acme Robotics, Inc.", party_b_name: "Beta Innovations LLC" }}
      />
    );
    expect(screen.getByText("Acme Robotics, Inc.")).toBeInTheDocument();
    expect(screen.getByText("Beta Innovations LLC")).toBeInTheDocument();
  });

  it("renders a link run as an anchor pointing at its href", () => {
    const documentWithLink: RenderedDocument = {
      ...document,
      blocks: [
        {
          level: 0,
          marker: "",
          heading: null,
          runs: [
            { type: "text", text: "See the " },
            { type: "link", text: "AI Addendum Standard Terms", href: "https://commonpaper.com/standards/ai-addendum/1.0/" },
            { type: "text", text: "." },
          ],
        },
      ],
    };
    render(<DocumentPreview document={documentWithLink} fields={{}} />);
    const link = screen.getByRole("link", { name: "AI Addendum Standard Terms" });
    expect(link).toHaveAttribute("href", "https://commonpaper.com/standards/ai-addendum/1.0/");
  });
});
