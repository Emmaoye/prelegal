"use client";

import { useState } from "react";
import { DocumentFields, RenderedDocument } from "@/lib/document-types";
import { ChatMessage, sendChatMessage } from "@/lib/document-chat-api";

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hi! What kind of legal document would you like to create today?",
};

export interface UseDocumentChatResult {
  messages: ChatMessage[];
  documentType: string | null;
  documentName: string | null;
  fields: DocumentFields;
  document: RenderedDocument | null;
  isSending: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
}

export function useDocumentChat(): UseDocumentChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [fields, setFields] = useState<DocumentFields>({});
  const [document, setDocument] = useState<RenderedDocument | null>(null);
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
      const result = await sendChatMessage(nextMessages, documentType, fields);
      setDocumentType(result.documentType);
      setDocumentName(result.documentName);
      setFields(result.fields);
      setDocument(result.document);
      setMessages((current) => [...current, { role: "assistant", content: result.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return { messages, documentType, documentName, fields, document, isSending, error, sendMessage };
}
