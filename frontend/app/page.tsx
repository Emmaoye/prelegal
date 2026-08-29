"use client";

import { useState } from "react";
import DownloadNdaButton from "@/components/DownloadNdaButton";
import NdaForm from "@/components/NdaForm";
import NdaPreview from "@/components/NdaPreview";
import { emptyNdaFormData, isNdaFormComplete, NdaFormData } from "@/lib/types";

export default function Home() {
  const [formData, setFormData] = useState<NdaFormData>(emptyNdaFormData);
  const complete = isNdaFormComplete(formData);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mutual NDA Creator</h1>
        <p className="mt-1 text-sm text-gray-600">
          Fill in the details below to generate a Mutual Non-Disclosure Agreement, then
          download it as a PDF.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <section>
          <NdaForm value={formData} onChange={setFormData} />
          <div className="mt-6">
            <DownloadNdaButton data={formData} disabled={!complete} />
            {!complete && (
              <p className="mt-2 text-xs text-gray-500">
                Fill in all fields to enable the download.
              </p>
            )}
          </div>
        </section>

        <section className="h-fit rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <NdaPreview data={formData} />
        </section>
      </div>
    </main>
  );
}
