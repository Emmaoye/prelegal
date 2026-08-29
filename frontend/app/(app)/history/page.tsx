"use client";

import { useEffect, useState } from "react";
import DocumentPreview from "@/components/DocumentPreview";
import DownloadDocumentButton from "@/components/DownloadDocumentButton";
import { DocumentDetail, DocumentSummary, getDocument, listDocuments } from "@/lib/documents-api";

export default function HistoryPage() {
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDocuments()
      .then((docs) => {
        setDocuments(docs);
        if (docs.length > 0) setSelectedId(docs[0].id);
      })
      .catch(() => setError("Could not load your document history."));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing the stale preview when nothing is selected
      setSelected(null);
      return;
    }
    let cancelled = false;
    getDocument(selectedId)
      .then((doc) => {
        if (!cancelled) setSelected(doc);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load that document.");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-brand-navy">History</h1>
        <p className="mt-1 text-sm text-gray-600">
          Documents you&apos;ve previously generated. Select one to view and download it again.
        </p>
      </header>

      {error && (
        <p role="alert" className="mb-4 text-xs text-red-600">
          {error}
        </p>
      )}

      {documents === null && !error && <p className="text-sm text-gray-500">Loading your documents…</p>}

      {documents !== null && documents.length === 0 && (
        <p className="text-sm text-gray-500">
          You haven&apos;t generated any documents yet. Head to the Document Creator to get started.
        </p>
      )}

      {documents !== null && documents.length > 0 && (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[16rem_1fr]">
          <ul className="space-y-1">
            {documents.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(doc.id)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    doc.id === selectedId ? "bg-brand-navy text-white" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="block font-medium">{doc.documentName}</span>
                  <span className={`block text-xs ${doc.id === selectedId ? "text-white/70" : "text-gray-500"}`}>
                    {new Date(doc.updatedAt).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <section className="h-fit rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
            {selected ? (
              <>
                <DocumentPreview document={selected.document} fields={selected.fields} />
                <div className="mt-6">
                  <DownloadDocumentButton document={selected.document} fields={selected.fields} />
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">Select a document to preview it here.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
