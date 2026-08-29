import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useNdaChat } from "./useNdaChat";
import { emptyNdaFormData } from "./types";

describe("useNdaChat", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts with a greeting message and empty fields", () => {
    const { result } = renderHook(() => useNdaChat());

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe("assistant");
    expect(result.current.fields).toEqual(emptyNdaFormData);
  });

  it("sends the running history and current fields, then applies the response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: "Got it, what's Party B's name?",
        fields: { ...emptyNdaFormData, partyA: { name: "Acme Corp", address: "" } },
      }),
    });

    const { result } = renderHook(() => useNdaChat());

    await act(async () => {
      await result.current.sendMessage("Party A is Acme Corp");
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/nda-chat/message",
      expect.objectContaining({ method: "POST" })
    );
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.messages.at(-1)).toEqual({ role: "user", content: "Party A is Acme Corp" });
    expect(body.knownFields).toEqual(emptyNdaFormData);

    expect(result.current.fields.partyA.name).toBe("Acme Corp");
    expect(result.current.messages.at(-1)).toEqual({
      role: "assistant",
      content: "Got it, what's Party B's name?",
    });
  });

  it("ignores blank or whitespace-only messages", async () => {
    const { result } = renderHook(() => useNdaChat());

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

    const { result } = renderHook(() => useNdaChat());

    await act(async () => {
      await result.current.sendMessage("hello");
    });

    await waitFor(() => {
      expect(result.current.error).toBe(
        "The assistant is temporarily unavailable. Please try again."
      );
    });
    expect(result.current.messages.some((m) => m.role === "user" && m.content === "hello")).toBe(
      true
    );
    expect(result.current.fields).toEqual(emptyNdaFormData);
  });

  it("sets isSending while a request is in flight", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    (fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    const { result } = renderHook(() => useNdaChat());

    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage("hello");
    });

    await waitFor(() => expect(result.current.isSending).toBe(true));

    await act(async () => {
      resolveFetch({ ok: true, json: async () => ({ reply: "hi", fields: emptyNdaFormData }) });
      await sendPromise;
    });

    expect(result.current.isSending).toBe(false);
  });
});
