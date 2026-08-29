"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/lib/document-chat-api";

interface DocumentChatProps {
  messages: ChatMessage[];
  isSending: boolean;
  error: string | null;
  onSend: (text: string) => void;
}

export default function DocumentChat({ messages, isSending, error, onSend }: DocumentChatProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // The input is disabled while a request is in flight (below), so focus is
  // lost to the document body once that happens - restore it as soon as the
  // input becomes enabled again, right when the assistant's reply arrives.
  useEffect(() => {
    if (!isSending) inputRef.current?.focus();
  }, [isSending]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || isSending) return;
    onSend(draft);
    setDraft("");
  }

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex max-h-[28rem] min-h-[20rem] flex-col gap-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              message.role === "assistant"
                ? "self-start bg-gray-100 text-gray-900"
                : "self-end bg-brand-blue text-white"
            }`}
          >
            {message.content}
          </div>
        ))}
        {isSending && (
          <div className="self-start rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500">
            Thinking…
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-gray-200 p-3">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={isSending}
          placeholder="Type your answer…"
          aria-label="Message"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={isSending || !draft.trim()}
          className="inline-flex items-center justify-center rounded-md bg-brand-purple px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-purple-hover disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Send
        </button>
      </form>

      {error && (
        <p role="alert" className="px-3 pb-3 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
