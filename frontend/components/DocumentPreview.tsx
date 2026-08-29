import { DocumentBlock, DocumentFields, RenderedDocument, Run } from "@/lib/document-types";
import { DOCUMENT_DISCLAIMER, fieldDisplayValue, partyDisplayName } from "@/lib/document-render";

function RunView({ run }: { run: Run }) {
  if (run.type === "field") {
    const filled = Boolean(run.value.trim());
    return (
      <span className={filled ? "font-medium text-gray-900" : "italic text-gray-400"}>
        {fieldDisplayValue(run)}
      </span>
    );
  }
  if (run.type === "link") {
    return (
      <a href={run.href} className={`text-brand-blue underline ${run.bold ? "font-semibold" : ""}`}>
        {run.text}
      </a>
    );
  }
  return <span className={run.bold ? "font-semibold text-gray-900" : undefined}>{run.text}</span>;
}

function BlockView({ block }: { block: DocumentBlock }) {
  return (
    <div className="mb-3" style={{ marginLeft: `${block.level * 1.25}rem` }}>
      {block.marker && <span className="text-gray-500">{block.marker} </span>}
      {block.heading && <span className="font-semibold text-gray-900">{block.heading}. </span>}
      {block.runs.map((run, index) => (
        <RunView key={index} run={run} />
      ))}
    </div>
  );
}

export default function DocumentPreview({
  document,
  fields,
}: {
  document: RenderedDocument | null;
  fields: DocumentFields;
}) {
  if (!document) {
    return (
      <p className="text-sm text-gray-500">
        Tell the assistant what kind of document you&apos;d like to create to see a preview here.
      </p>
    );
  }

  return (
    <article className="text-sm leading-relaxed text-gray-800">
      <h1 className="mb-4 text-center text-lg font-bold uppercase tracking-wide text-gray-900">
        {document.name}
      </h1>

      <p className="mb-6 rounded-md border border-brand-yellow/50 bg-brand-yellow/10 px-4 py-3 text-xs font-medium text-brand-navy">
        {DOCUMENT_DISCLAIMER}
      </p>

      {document.blocks.map((block, index) => (
        <BlockView key={index} block={block} />
      ))}

      <div className="mt-10 grid grid-cols-2 gap-8">
        {(["party_a_name", "party_b_name"] as const).map((key, index) => (
          <div key={key} className="space-y-8">
            <div className="border-t border-gray-400 pt-2">
              <p className="font-medium text-gray-900">
                {partyDisplayName(fields, key, `Party ${index === 0 ? "A" : "B"}`)}
              </p>
              <p className="mt-6 text-gray-500">Signature: ____________________</p>
              <p className="mt-2 text-gray-500">Date: ____________________</p>
            </div>
          </div>
        ))}
      </div>

    </article>
  );
}
