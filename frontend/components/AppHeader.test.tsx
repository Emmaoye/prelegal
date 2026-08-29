import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppHeader from "./AppHeader";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("AppHeader", () => {
  it("shows the product name, nav links, and signed-in email", () => {
    render(<AppHeader user={{ id: 1, email: "a@example.com" }} onLogout={vi.fn()} />);
    expect(screen.getByText("Prelegal")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Document Creator" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("href", "/history");
    expect(screen.getByText("Signed in as a@example.com")).toBeInTheDocument();
  });

  it("calls onLogout when the log out button is clicked", async () => {
    const onLogout = vi.fn();
    const user = userEvent.setup();
    render(<AppHeader user={{ id: 1, email: "a@example.com" }} onLogout={onLogout} />);

    await user.click(screen.getByRole("button", { name: "Log out" }));
    expect(onLogout).toHaveBeenCalled();
  });
});
