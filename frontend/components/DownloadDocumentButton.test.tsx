import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DownloadDocumentButton from "./DownloadDocumentButton";
import { RenderedDocument } from "@/lib/document-types";

const document: RenderedDocument = {
  slug: "mutual_nda",
  name: "Mutual Non-Disclosure Agreement",
  blocks: [],
};

const toBlobMock = vi.fn();

// DocumentPdfDocument calls StyleSheet.create(...) at module load time and
// uses Document/Page/Text/View/Link as JSX tags, so the mock needs stand-ins
// for all of them even though only `pdf` is exercised directly here.
vi.mock("@react-pdf/renderer", () => ({
  pdf: vi.fn(() => ({ toBlob: toBlobMock })),
  Document: "mock-document",
  Page: "mock-page",
  Text: "mock-text",
  View: "mock-view",
  Link: "mock-link",
  StyleSheet: { create: (styles: unknown) => styles },
  Font: { register: vi.fn() },
}));

describe("DownloadDocumentButton", () => {
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    toBlobMock.mockReset();
    toBlobMock.mockResolvedValue(new Blob(["pdf-bytes"], { type: "application/pdf" }));

    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();

    clickSpy = vi.fn();
    const originalCreateElement = window.document.createElement.bind(window.document);
    vi.spyOn(window.document, "createElement").mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === "a") (element as HTMLAnchorElement).click = clickSpy as () => void;
      return element;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is enabled by default", () => {
    render(<DownloadDocumentButton document={document} fields={{}} />);
    expect(screen.getByRole("button")).toBeEnabled();
  });

  it("names the button and the downloaded file after the document", () => {
    render(<DownloadDocumentButton document={document} fields={{}} />);
    expect(
      screen.getByRole("button", { name: "Download Mutual Non-Disclosure Agreement as PDF" })
    ).toBeInTheDocument();
  });

  it("generates a PDF and triggers a download named after the document's slug on click", async () => {
    const user = userEvent.setup();
    render(<DownloadDocumentButton document={document} fields={{}} />);

    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    expect(toBlobMock).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("shows a generating state while the PDF is being built, then reverts", async () => {
    let resolveBlob!: (blob: Blob) => void;
    toBlobMock.mockReturnValue(
      new Promise<Blob>((resolve) => {
        resolveBlob = resolve;
      })
    );

    const user = userEvent.setup();
    render(<DownloadDocumentButton document={document} fields={{}} />);
    const button = screen.getByRole("button");

    await user.click(button);
    expect(button).toHaveTextContent("Generating PDF…");
    expect(button).toBeDisabled();

    resolveBlob(new Blob(["pdf-bytes"]));

    await waitFor(() => expect(button).toHaveTextContent("Download Mutual Non-Disclosure Agreement as PDF"));
    expect(button).toBeEnabled();
  });

  it("re-enables the button and shows an error message if PDF generation throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    toBlobMock.mockRejectedValue(new Error("render failed"));
    const user = userEvent.setup();
    render(<DownloadDocumentButton document={document} fields={{}} />);
    const button = screen.getByRole("button");

    await user.click(button);

    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.getByRole("alert")).toHaveTextContent(/went wrong/i);
    expect(clickSpy).not.toHaveBeenCalled();
  });
});
