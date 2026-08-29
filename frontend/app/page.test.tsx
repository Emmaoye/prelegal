import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";
import { setStoredUser } from "@/lib/auth";
import { emptyNdaFormData, NdaFormData } from "@/lib/types";

vi.mock("@react-pdf/renderer", () => ({
  pdf: vi.fn(() => ({ toBlob: vi.fn().mockResolvedValue(new Blob()) })),
  Document: "mock-document",
  Page: "mock-page",
  Text: "mock-text",
  View: "mock-view",
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

const completeFields: NdaFormData = {
  partyA: { name: "Acme Robotics, Inc.", address: "500 Market St" },
  partyB: { name: "Beta Innovations LLC", address: "200 Elm Ave" },
  effectiveDate: "2026-09-01",
  purpose: "evaluating a partnership",
  termYears: "2",
  governingState: "Delaware",
};

function mockChatResponse(reply: string, fields: NdaFormData) {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ reply, fields }),
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

  it("keeps the download button disabled until the chat reports every field filled", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const downloadButton = screen.getByRole("button", { name: /download nda as pdf/i });
    expect(downloadButton).toBeDisabled();

    mockChatResponse("Got it, what's next?", {
      ...emptyNdaFormData,
      partyA: completeFields.partyA,
    });
    await user.type(screen.getByLabelText("Message"), "Party A is Acme Robotics");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Got it, what's next?")).toBeInTheDocument();
    expect(downloadButton).toBeDisabled();

    mockChatResponse("All set!", completeFields);
    await user.type(screen.getByLabelText("Message"), "Delaware governs it");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await screen.findByText("All set!");
    expect(downloadButton).toBeEnabled();
  });

  it("reflects chat-populated fields in the live preview", async () => {
    const user = userEvent.setup();
    render(<Home />);

    mockChatResponse("Got it.", { ...emptyNdaFormData, partyA: completeFields.partyA });
    await user.type(screen.getByLabelText("Message"), "Party A is Acme Robotics, Inc.");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await screen.findByText("Got it.");
    expect(screen.getByText("Acme Robotics, Inc.")).toBeInTheDocument();
  });

  it("disables the download button again if a later response regresses a field", async () => {
    const user = userEvent.setup();
    render(<Home />);

    mockChatResponse("All set!", completeFields);
    await user.type(screen.getByLabelText("Message"), "here are all the details");
    await user.click(screen.getByRole("button", { name: "Send" }));

    const downloadButton = screen.getByRole("button", { name: /download nda as pdf/i });
    await screen.findByText("All set!");
    expect(downloadButton).toBeEnabled();

    mockChatResponse("Sure, what's the new governing state?", {
      ...completeFields,
      governingState: "",
    });
    await user.type(screen.getByLabelText("Message"), "actually let's change the state");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await screen.findByText("Sure, what's the new governing state?");
    expect(downloadButton).toBeDisabled();
  });
});
