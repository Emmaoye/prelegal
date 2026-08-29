"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { NdaFormData } from "@/lib/types";
import NdaPdfDocument from "./NdaPdfDocument";

export default function DownloadNdaButton({
  data,
  disabled,
}: {
  data: NdaFormData;
  disabled?: boolean;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(false);

  async function handleDownload() {
    setIsGenerating(true);
    setError(false);
    try {
      const blob = await pdf(<NdaPdfDocument data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mutual-nda.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate NDA PDF", err);
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
        disabled={disabled || isGenerating}
        className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {isGenerating ? "Generating PDF…" : "Download NDA as PDF"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          Something went wrong generating the PDF. Please try again.
        </p>
      )}
    </div>
  );
}
