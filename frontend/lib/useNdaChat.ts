"use client";

import { useState } from "react";
import { emptyNdaFormData, NdaFormData } from "@/lib/types";
import { ChatMessage, sendNdaChatMessage } from "@/lib/nda-chat-api";

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hi! Let's put together your Mutual NDA. What's the legal name of the first party?",
};

export interface UseNdaChatResult {
  messages: ChatMessage[];
  fields: NdaFormData;
  isSending: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
}

export function useNdaChat(): UseNdaChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [fields, setFields] = useState<NdaFormData>(emptyNdaFormData);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const nextMessages = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(nextMessages);
    setIsSending(true);
    setError(null);

    try {
      const result = await sendNdaChatMessage(nextMessages, fields);
      setFields(result.fields);
      setMessages((current) => [...current, { role: "assistant", content: result.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return { messages, fields, isSending, error, sendMessage };
}
