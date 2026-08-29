import { DocumentFields, RenderedDocument } from "@/lib/document-types";

export interface DocumentSummary {
  id: string;
  documentType: string;
  documentName: string;
  updatedAt: string;
}

export interface DocumentDetail extends DocumentSummary {
  fields: DocumentFields;
  document: RenderedDocument;
}

export class DocumentsError extends Error {}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const response = await fetch("/api/documents");
  if (!response.ok) {
    throw new DocumentsError("Could not load your document history.");
  }
  return (await response.json()) as DocumentSummary[];
}

export async function getDocument(id: string): Promise<DocumentDetail> {
  const response = await fetch(`/api/documents/${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw new DocumentsError("Could not load that document.");
  }
  return (await response.json()) as DocumentDetail;
}
