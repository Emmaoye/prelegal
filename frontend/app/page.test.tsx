import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./page";

vi.mock("@react-pdf/renderer", () => ({
  pdf: vi.fn(() => ({ toBlob: vi.fn().mockResolvedValue(new Blob()) })),
  Document: "mock-document",
  Page: "mock-page",
  Text: "mock-text",
  View: "mock-view",
  StyleSheet: { create: (styles: unknown) => styles },
  Font: { register: vi.fn() },
}));

describe("Home page", () => {
  it("keeps the download button disabled until every field is filled", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const downloadButton = screen.getByRole("button", { name: /download nda as pdf/i });
    expect(downloadButton).toBeDisabled();

    const [partyAName, partyBName] = screen.getAllByLabelText("Legal name");
    const [partyAAddress, partyBAddress] = screen.getAllByLabelText("Address");

    await user.type(partyAName, "Acme Robotics, Inc.");
    await user.type(partyAAddress, "500 Market St");
    await user.type(partyBName, "Beta Innovations LLC");
    await user.type(partyBAddress, "200 Elm Ave");
    await user.type(screen.getByLabelText("Effective date"), "2026-09-01");
    await user.type(
      screen.getByLabelText("Purpose of disclosure"),
      "evaluating a partnership"
    );
    // Term (years) already defaults to "2"; only governing state is left.
    expect(downloadButton).toBeDisabled();

    await user.type(screen.getByLabelText("Governing state"), "Delaware");

    expect(downloadButton).toBeEnabled();
  });

  it("reflects form input in the live preview", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const [partyAName] = screen.getAllByLabelText("Legal name");
    await user.type(partyAName, "Acme Robotics, Inc.");

    // Signature block renders the party name as its own text node.
    expect(screen.getByText("Acme Robotics, Inc.")).toBeInTheDocument();
  });

  it("disables the download button again if a required field is cleared", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const [partyAName, partyBName] = screen.getAllByLabelText("Legal name");
    const [partyAAddress, partyBAddress] = screen.getAllByLabelText("Address");
    await user.type(partyAName, "Acme Robotics, Inc.");
    await user.type(partyAAddress, "500 Market St");
    await user.type(partyBName, "Beta Innovations LLC");
    await user.type(partyBAddress, "200 Elm Ave");
    await user.type(screen.getByLabelText("Effective date"), "2026-09-01");
    await user.type(screen.getByLabelText("Purpose of disclosure"), "a partnership");
    await user.type(screen.getByLabelText("Governing state"), "Delaware");

    const downloadButton = screen.getByRole("button", { name: /download nda as pdf/i });
    expect(downloadButton).toBeEnabled();

    await user.clear(screen.getByLabelText("Governing state"));
    expect(downloadButton).toBeDisabled();
  });
});
