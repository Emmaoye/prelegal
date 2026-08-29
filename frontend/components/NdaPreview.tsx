import { NdaFormData } from "@/lib/types";
import {
  NDA_DISCLAIMER,
  NDA_TITLE,
  getIntroParagraph,
  getNdaSections,
  getPartyDisplayName,
} from "@/lib/nda-template";

export default function NdaPreview({ data }: { data: NdaFormData }) {
  const sections = getNdaSections(data);

  return (
    <article className="text-sm leading-relaxed text-gray-800">
      <h1 className="mb-6 text-center text-lg font-bold tracking-wide text-gray-900">
        {NDA_TITLE}
      </h1>

      <p className="mb-4">{getIntroParagraph(data)}</p>

      {sections.map((section) => (
        <div key={section.heading} className="mb-4">
          <h2 className="mb-1 font-semibold text-gray-900">{section.heading}</h2>
          <p>{section.body}</p>
        </div>
      ))}

      <div className="mt-10 grid grid-cols-2 gap-8">
        {([
          [data.partyA, "A"],
          [data.partyB, "B"],
        ] as const).map(([party, label]) => (
          <div key={label} className="space-y-8">
            <div className="border-t border-gray-400 pt-2">
              <p className="font-medium text-gray-900">
                {getPartyDisplayName(party, label)}
              </p>
              <p className="mt-6 text-gray-500">Signature: ____________________</p>
              <p className="mt-2 text-gray-500">Date: ____________________</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-10 border-t border-gray-200 pt-4 text-xs text-gray-400">
        {NDA_DISCLAIMER}
      </p>
    </article>
  );
}
