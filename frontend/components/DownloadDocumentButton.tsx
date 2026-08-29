"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { DocumentFields, RenderedDocument } from "@/lib/document-types";
import DocumentPdfDocument from "./DocumentPdfDocument";

export default function DownloadDocumentButton({
  document,
  fields,
}: {
  document: RenderedDocument;
  fields: DocumentFields;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(false);

  async function handleDownload() {
    setIsGenerating(true);
    setError(false);
    try {
      const blob = await pdf(<DocumentPdfDocument document={document} fields={fields} />).toBlob();
      const url = URL.createObjectURL(blob);
      // Named `documentWindow` (not `document`) to avoid shadowing the
      // global DOM `document` with this component's `document` prop.
      const documentWindow = window.document;
      const link = documentWindow.createElement("a");
      link.href = url;
      link.download = `${document.slug}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate document PDF", err);
      setError(true);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isGenerating}
        className="inline-flex items-center justify-center rounded-md bg-brand-purple px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-purple-hover disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {isGenerating ? "Generating PDF…" : `Download ${document.name} as PDF`}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          Something went wrong generating the PDF. Please try again.
        </p>
      )}
    </div>
  );
}
