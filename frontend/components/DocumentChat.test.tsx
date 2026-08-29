import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DocumentChat from "./DocumentChat";

const messages = [
  { role: "assistant" as const, content: "Hi! What kind of legal document would you like to create today?" },
  { role: "user" as const, content: "An NDA" },
];

describe("DocumentChat", () => {
  it("renders messages by role", () => {
    render(<DocumentChat messages={messages} isSending={false} error={null} onSend={vi.fn()} />);
    expect(screen.getByText("An NDA")).toBeInTheDocument();
    expect(screen.getByText(/what kind of legal document/i)).toBeInTheDocument();
  });

  it("submits trimmed text and clears the draft", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<DocumentChat messages={messages} isSending={false} error={null} onSend={onSend} />);

    const input = screen.getByLabelText("Message");
    await user.type(input, "  It's a Mutual NDA  ");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSend).toHaveBeenCalledWith("  It's a Mutual NDA  ");
    expect(input).toHaveValue("");
  });

  it("does not submit blank input", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<DocumentChat messages={messages} isSending={false} error={null} onSend={onSend} />);

    await user.type(screen.getByLabelText("Message"), "   ");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables the input and send button while sending", () => {
    render(<DocumentChat messages={messages} isSending error={null} onSend={vi.fn()} />);
    expect(screen.getByLabelText("Message")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    expect(screen.getByText("Thinking…")).toBeInTheDocument();
  });

  it("shows an error alert when provided", () => {
    render(<DocumentChat messages={messages} isSending={false} error="Something broke" onSend={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something broke");
  });

  it("focuses the message input once sending finishes", () => {
    const { rerender } = render(<DocumentChat messages={messages} isSending error={null} onSend={vi.fn()} />);
    expect(screen.getByLabelText("Message")).not.toHaveFocus();

    rerender(<DocumentChat messages={messages} isSending={false} error={null} onSend={vi.fn()} />);

    expect(screen.getByLabelText("Message")).toHaveFocus();
  });
});
