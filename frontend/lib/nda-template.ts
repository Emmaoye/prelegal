import { NdaFormData } from "./types";

export const NDA_TITLE = "MUTUAL NON-DISCLOSURE AGREEMENT";

export const NDA_DISCLAIMER =
  "This document is a generic template provided for informational purposes only. It does not constitute legal advice and should be reviewed by a qualified attorney before use.";

export interface NdaSection {
  heading: string;
  body: string;
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "[Effective Date]";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "[Effective Date]";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fallback(value: string, placeholder: string): string {
  return value.trim() ? value.trim() : placeholder;
}

export function getIntroParagraph(data: NdaFormData): string {
  const partyAName = fallback(data.partyA.name, "[Party A Name]");
  const partyAAddress = fallback(data.partyA.address, "[Party A Address]");
  const partyBName = fallback(data.partyB.name, "[Party B Name]");
  const partyBAddress = fallback(data.partyB.address, "[Party B Address]");
  const effectiveDate = formatDisplayDate(data.effectiveDate);

  return `This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of ${effectiveDate} (the "Effective Date"), by and between ${partyAName}, located at ${partyAAddress} ("Party A"), and ${partyBName}, located at ${partyBAddress} ("Party B"). Party A and Party B may each be referred to individually as a "Party" and collectively as the "Parties."`;
}

export function getNdaSections(data: NdaFormData): NdaSection[] {
  const purpose = fallback(data.purpose, "[Purpose of Disclosure]");
  const termYears = fallback(data.termYears, "[Term]");
  const governingState = fallback(data.governingState, "[Governing State]");

  return [
    {
      heading: "1. Purpose",
      body: `The Parties wish to explore a potential business relationship in connection with ${purpose} (the "Purpose"). In connection with the Purpose, each Party may disclose to the other certain confidential and proprietary information.`,
    },
    {
      heading: "2. Definition of Confidential Information",
      body: `"Confidential Information" means any non-public information disclosed by one Party (the "Disclosing Party") to the other Party (the "Receiving Party"), whether orally, in writing, or in any other form, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure.`,
    },
    {
      heading: "3. Obligations of Receiving Party",
      body: `The Receiving Party shall: (a) use the Confidential Information solely for the Purpose; (b) hold the Confidential Information in strict confidence and not disclose it to any third party without the prior written consent of the Disclosing Party; and (c) protect the Confidential Information using at least the same degree of care it uses to protect its own confidential information of a similar nature, and in no event less than a reasonable degree of care.`,
    },
    {
      heading: "4. Exclusions",
      body: `Confidential Information does not include information that: (a) is or becomes publicly available through no fault of the Receiving Party; (b) was rightfully known to the Receiving Party prior to disclosure by the Disclosing Party; (c) is rightfully received from a third party without breach of any confidentiality obligation; or (d) is independently developed by the Receiving Party without use of or reference to the Disclosing Party's Confidential Information.`,
    },
    {
      heading: "5. Term",
      body: `This Agreement shall remain in effect for a period of ${termYears} year(s) from the Effective Date, unless earlier terminated by either Party upon thirty (30) days' written notice to the other Party. Each Party's obligations of confidentiality under this Agreement shall survive any termination or expiration of this Agreement.`,
    },
    {
      heading: "6. Return or Destruction of Materials",
      body: `Upon the Disclosing Party's written request, the Receiving Party shall promptly return to the Disclosing Party or destroy all documents and other tangible materials containing or reflecting the Confidential Information, and any copies thereof.`,
    },
    {
      heading: "7. No License",
      body: `Nothing in this Agreement shall be construed as granting any rights, by license or otherwise, to any Confidential Information disclosed under this Agreement, except as expressly set forth herein.`,
    },
    {
      heading: "8. Governing Law",
      body: `This Agreement shall be governed by and construed in accordance with the laws of the State of ${governingState}, without regard to its conflict of laws principles.`,
    },
    {
      heading: "9. Entire Agreement",
      body: `This Agreement constitutes the entire agreement between the Parties concerning the subject matter hereof and supersedes all prior or contemporaneous agreements and understandings, whether written or oral, relating to that subject matter.`,
    },
  ];
}
