import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppLayout from "./layout";

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/",
}));

describe("AppLayout", () => {
  beforeEach(() => {
    router.replace.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /login and renders nothing while there is no session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => null }));

    const { container } = render(
      <AppLayout>
        <p>Protected content</p>
      </AppLayout>
    );

    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the header and children once the session check succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 1, email: "test@example.com" }) })
    );

    render(
      <AppLayout>
        <p>Protected content</p>
      </AppLayout>
    );

    expect(await screen.findByText("Protected content")).toBeInTheDocument();
    expect(screen.getByText("Signed in as test@example.com")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
