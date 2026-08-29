"use client";

import DownloadNdaButton from "@/components/DownloadNdaButton";
import NdaChat from "@/components/NdaChat";
import NdaPreview from "@/components/NdaPreview";
import { isNdaFormComplete } from "@/lib/types";
import { ndaFormHasUnsupportedPdfCharacters } from "@/lib/pdf-font-support";
import { useAuthGate, useLogout } from "@/lib/useAuthGate";
import { useNdaChat } from "@/lib/useNdaChat";

export default function Home() {
  const user = useAuthGate();
  const logout = useLogout();
  const { messages, fields, isSending, error, sendMessage } = useNdaChat();
  const complete = isNdaFormComplete(fields);
  const hasUnsupportedCharacters = ndaFormHasUnsupportedPdfCharacters(fields);

  if (!user) return null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-4 flex justify-end text-xs text-gray-500">
        Signed in as {user.email} ·{" "}
        <button type="button" onClick={logout} className="ml-1 underline hover:text-gray-700">
          Log out
        </button>
      </div>

      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mutual NDA Creator</h1>
        <p className="mt-1 text-sm text-gray-600">
          Chat with the assistant to fill in the details, then download your NDA as a PDF.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <section>
          <NdaChat messages={messages} isSending={isSending} error={error} onSend={sendMessage} />
          <div className="mt-6">
            <DownloadNdaButton data={fields} disabled={!complete} />
            {!complete && (
              <p className="mt-2 text-xs text-gray-500">
                Answer the assistant&apos;s questions to enable the download.
              </p>
            )}
            {hasUnsupportedCharacters && (
              <p className="mt-2 text-xs text-amber-600">
                Some characters you entered may not display correctly in the downloaded
                PDF (the PDF font does not support every script, e.g. Chinese, Japanese,
                Arabic, or Hebrew).
              </p>
            )}
          </div>
        </section>

        <section className="h-fit rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <NdaPreview data={fields} />
        </section>
      </div>
    </main>
  );
}
