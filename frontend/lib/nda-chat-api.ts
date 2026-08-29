import { NdaFormData } from "@/lib/types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface NdaChatResult {
  reply: string;
  fields: NdaFormData;
}

export class NdaChatError extends Error {}

export async function sendNdaChatMessage(
  messages: ChatMessage[],
  knownFields: NdaFormData
): Promise<NdaChatResult> {
  const response = await fetch("/api/nda-chat/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, knownFields }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new NdaChatError(body?.detail ?? "Something went wrong. Please try again.");
  }

  return (await response.json()) as NdaChatResult;
}
