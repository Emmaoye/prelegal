import { DocumentFields, FieldRun } from "@/lib/document-types";

export const DOCUMENT_DISCLAIMER =
  "This document is a generic template provided for informational purposes only. It does not constitute legal advice and should be reviewed by a qualified attorney before use.";

/** The value to display for a field run: its known value, or the original
 * template label bracketed as a placeholder, with the possessive suffix
 * (if any) reattached so the surrounding sentence still reads correctly. */
export function fieldDisplayValue(run: FieldRun): string {
  const base = run.value.trim() || `[${run.label}]`;
  return run.possessive ? `${base}’s` : base;
}

export function partyDisplayName(fields: DocumentFields, key: "party_a_name" | "party_b_name", fallback: string): string {
  return fields[key]?.trim() || fallback;
}
