import { DocumentFields, RenderedDocument } from "@/lib/document-types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResult {
  documentType: string | null;
  documentName: string | null;
  reply: string;
  fields: DocumentFields;
  document: RenderedDocument | null;
}

export class ChatError extends Error {}

export async function sendChatMessage(
  messages: ChatMessage[],
  documentType: string | null,
  knownFields: DocumentFields,
  conversationId: string
): Promise<ChatResult> {
  const response = await fetch("/api/chat/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, documentType, knownFields, conversationId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ChatError(body?.detail ?? "Something went wrong. Please try again.");
  }

  return (await response.json()) as ChatResult;
}
