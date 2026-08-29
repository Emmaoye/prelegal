import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useDocumentChat } from "./useDocumentChat";

describe("useDocumentChat", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts with a generic greeting, no document type, and empty fields", () => {
    const { result } = renderHook(() => useDocumentChat());

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe("assistant");
    expect(result.current.documentType).toBeNull();
    expect(result.current.document).toBeNull();
    expect(result.current.fields).toEqual({});
  });

  it("sends the running history, current document type, and fields, then applies the response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        documentType: "mutual_nda",
        documentName: "Mutual Non-Disclosure Agreement",
        reply: "Got it, what's the purpose?",
        fields: { party_a_name: "Acme Corp" },
        document: { slug: "mutual_nda", name: "Mutual Non-Disclosure Agreement", blocks: [] },
      }),
    });

    const { result } = renderHook(() => useDocumentChat());

    await act(async () => {
      await result.current.sendMessage("I need an NDA, we're Acme Corp");
    });

    expect(fetch).toHaveBeenCalledWith("/api/chat/message", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.messages.at(-1)).toEqual({ role: "user", content: "I need an NDA, we're Acme Corp" });
    expect(body.documentType).toBeNull();
    expect(body.knownFields).toEqual({});

    expect(result.current.documentType).toBe("mutual_nda");
    expect(result.current.documentName).toBe("Mutual Non-Disclosure Agreement");
    expect(result.current.fields.party_a_name).toBe("Acme Corp");
    expect(result.current.document).not.toBeNull();
    expect(result.current.messages.at(-1)).toEqual({
      role: "assistant",
      content: "Got it, what's the purpose?",
    });
  });

  it("sends the confirmed document type on subsequent turns", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        documentType: "mutual_nda",
        documentName: "Mutual Non-Disclosure Agreement",
        reply: "Noted.",
        fields: {},
        document: { slug: "mutual_nda", name: "Mutual Non-Disclosure Agreement", blocks: [] },
      }),
    });

    const { result } = renderHook(() => useDocumentChat());
    await act(async () => {
      await result.current.sendMessage("I need an NDA");
    });
    await act(async () => {
      await result.current.sendMessage("The purpose is a partnership");
    });

    const secondCallBody = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[1][1].body);
    expect(secondCallBody.documentType).toBe("mutual_nda");
  });

  it("ignores blank or whitespace-only messages", async () => {
    const { result } = renderHook(() => useDocumentChat());

    await act(async () => {
      await result.current.sendMessage("   ");
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(1);
  });

  it("surfaces an error and keeps the user's message on failure", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ detail: "The assistant is temporarily unavailable. Please try again." }),
    });

    const { result } = renderHook(() => useDocumentChat());

    await act(async () => {
      await result.current.sendMessage("hello");
    });

    await waitFor(() => {
      expect(result.current.error).toBe("The assistant is temporarily unavailable. Please try again.");
    });
    expect(result.current.messages.some((m) => m.role === "user" && m.content === "hello")).toBe(true);
    expect(result.current.document).toBeNull();
  });

  it("sets isSending while a request is in flight", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    (fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    const { result } = renderHook(() => useDocumentChat());

    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage("hello");
    });

    await waitFor(() => expect(result.current.isSending).toBe(true));

    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({ documentType: null, documentName: null, reply: "hi", fields: {}, document: null }),
      });
      await sendPromise;
    });

    expect(result.current.isSending).toBe(false);
  });
});
