import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DownloadNdaButton from "./DownloadNdaButton";
import { emptyNdaFormData } from "@/lib/types";

const toBlobMock = vi.fn();

// NdaPdfDocument calls StyleSheet.create(...) at module load time and uses
// Document/Page/Text/View as JSX tags, so the mock needs stand-ins for all
// of them even though only `pdf` is exercised directly by this component.
vi.mock("@react-pdf/renderer", () => ({
  pdf: vi.fn(() => ({ toBlob: toBlobMock })),
  Document: "mock-document",
  Page: "mock-page",
  Text: "mock-text",
  View: "mock-view",
  StyleSheet: { create: (styles: unknown) => styles },
  Font: { register: vi.fn() },
}));

describe("DownloadNdaButton", () => {
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    toBlobMock.mockReset();
    toBlobMock.mockResolvedValue(new Blob(["pdf-bytes"], { type: "application/pdf" }));

    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();

    clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === "a") (element as HTMLAnchorElement).click = clickSpy as () => void;
      return element;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is disabled when disabled prop is true", () => {
    render(<DownloadNdaButton data={emptyNdaFormData} disabled />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is enabled when disabled prop is false", () => {
    render(<DownloadNdaButton data={emptyNdaFormData} disabled={false} />);
    expect(screen.getByRole("button")).toBeEnabled();
  });

  it("generates a PDF and triggers a download named mutual-nda.pdf on click", async () => {
    const user = userEvent.setup();
    render(<DownloadNdaButton data={emptyNdaFormData} />);

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
    render(<DownloadNdaButton data={emptyNdaFormData} />);
    const button = screen.getByRole("button");

    await user.click(button);
    expect(button).toHaveTextContent("Generating PDF…");
    expect(button).toBeDisabled();

    resolveBlob(new Blob(["pdf-bytes"]));

    await waitFor(() => expect(button).toHaveTextContent("Download NDA as PDF"));
    expect(button).toBeEnabled();
  });

  it("re-enables the button and shows an error message if PDF generation throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    toBlobMock.mockRejectedValue(new Error("render failed"));
    const user = userEvent.setup();
    render(<DownloadNdaButton data={emptyNdaFormData} />);
    const button = screen.getByRole("button");

    await user.click(button);

    await waitFor(() => expect(button).toBeEnabled());
    expect(button).toHaveTextContent("Download NDA as PDF");
    expect(screen.getByRole("alert")).toHaveTextContent(/went wrong/i);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("only generates one PDF when clicked twice in quick succession", async () => {
    let resolveBlob!: (blob: Blob) => void;
    toBlobMock.mockReturnValue(
      new Promise<Blob>((resolve) => {
        resolveBlob = resolve;
      })
    );

    const user = userEvent.setup();
    render(<DownloadNdaButton data={emptyNdaFormData} />);
    const button = screen.getByRole("button");

    // The button disables itself synchronously on click, so a second click
    // while generation is in flight must be a no-op (userEvent skips clicks
    // on disabled elements, matching real browser/user behavior).
    await user.click(button);
    await user.click(button);

    expect(toBlobMock).toHaveBeenCalledTimes(1);

    resolveBlob(new Blob(["pdf-bytes"]));
    await waitFor(() => expect(button).toBeEnabled());
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("clears a previous error on the next successful attempt", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    toBlobMock.mockRejectedValueOnce(new Error("render failed"));
    const user = userEvent.setup();
    render(<DownloadNdaButton data={emptyNdaFormData} />);
    const button = screen.getByRole("button");

    await user.click(button);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    toBlobMock.mockResolvedValueOnce(new Blob(["pdf-bytes"]));
    await user.click(button);

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});
