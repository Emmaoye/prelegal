import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NdaChat from "./NdaChat";

describe("NdaChat", () => {
  it("renders messages by role", () => {
    render(
      <NdaChat
        messages={[
          { role: "assistant", content: "What's Party A's name?" },
          { role: "user", content: "Acme Corp" },
        ]}
        isSending={false}
        error={null}
        onSend={vi.fn()}
      />
    );

    expect(screen.getByText("What's Party A's name?")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("submits the trimmed draft and clears the input", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<NdaChat messages={[]} isSending={false} error={null} onSend={onSend} />);

    const input = screen.getByLabelText("Message");
    await user.type(input, "  Acme Corp  ");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSend).toHaveBeenCalledWith("  Acme Corp  ");
    expect(input).toHaveValue("");
  });

  it("does not submit a blank draft", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<NdaChat messages={[]} isSending={false} error={null} onSend={onSend} />);

    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables input and the send button while sending", () => {
    render(<NdaChat messages={[]} isSending={true} error={null} onSend={vi.fn()} />);

    expect(screen.getByLabelText("Message")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    expect(screen.getByText("Thinking…")).toBeInTheDocument();
  });

  it("renders an error alert when error is set", () => {
    render(
      <NdaChat messages={[]} isSending={false} error="Something went wrong." onSend={vi.fn()} />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong.");
  });
});
