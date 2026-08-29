import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";
import { setStoredUser } from "@/lib/auth";
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

// Next's useRouter returns a stable object across renders; the mock must
// too, or a component that depends on it in a useEffect dependency array
// (like useAuthGate) will re-run that effect every render.
const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

const ndaDocument: RenderedDocument = {
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

function mockChatResponse(
  reply: string,
  fields: Record<string, string>,
  options: { documentType?: string | null; documentName?: string | null; document?: RenderedDocument | null } = {}
) {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      reply,
      fields,
      documentType: options.documentType ?? "mutual_nda",
      documentName: options.documentName ?? "Mutual Non-Disclosure Agreement",
      document: options.document === undefined ? ndaDocument : options.document,
    }),
  });
}

describe("Home page", () => {
  beforeEach(() => {
    setStoredUser({ id: 1, email: "test@example.com" });
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows no download button until the assistant confirms a document type", () => {
    render(<Home />);
    expect(screen.queryByRole("button", { name: /download/i })).not.toBeInTheDocument();
    expect(screen.getByText(/enable the download/i)).toBeInTheDocument();
  });

  it("shows the download button once the assistant confirms a document type", async () => {
    const user = userEvent.setup();
    render(<Home />);

    mockChatResponse("Great, let's create a Mutual NDA. What's your organization's name?", {});
    await user.type(screen.getByLabelText("Message"), "I need an NDA");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("button", { name: /download mutual non-disclosure agreement as pdf/i })).toBeInTheDocument();
  });

  it("reflects chat-populated fields in the live preview and page heading", async () => {
    const user = userEvent.setup();
    render(<Home />);

    mockChatResponse("Got it, what's the purpose?", { party_a_name: "Acme Robotics, Inc." });
    await user.type(screen.getByLabelText("Message"), "I need an NDA, we're Acme Robotics, Inc.");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await screen.findByText("Got it, what's the purpose?");
    expect(screen.getByText("Acme Robotics, Inc.")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Mutual Non-Disclosure Agreement" }).length).toBeGreaterThan(0);
  });

  it("returns focus to the message input after a response arrives", async () => {
    const user = userEvent.setup();
    render(<Home />);

    mockChatResponse("Got it, what's the purpose?", {});
    await user.type(screen.getByLabelText("Message"), "I need an NDA");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await screen.findByText("Got it, what's the purpose?");
    expect(screen.getByLabelText("Message")).toHaveFocus();
  });
});
