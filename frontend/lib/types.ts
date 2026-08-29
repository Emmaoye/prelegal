export interface PartyInfo {
  name: string;
  address: string;
}

export interface NdaFormData {
  partyA: PartyInfo;
  partyB: PartyInfo;
  effectiveDate: string;
  purpose: string;
  termYears: string;
  governingState: string;
}

export const emptyNdaFormData: NdaFormData = {
  partyA: { name: "", address: "" },
  partyB: { name: "", address: "" },
  effectiveDate: "",
  purpose: "",
  termYears: "2",
  governingState: "",
};

/**
 * Parses a term-years form value into a positive integer, or null if the
 * value isn't one (covers zero, negative, decimal, and non-numeric input,
 * which the number input's `min`/`type` attributes don't reliably block).
 */
export function parseTermYears(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return parsed > 0 ? parsed : null;
}

export function isNdaFormComplete(data: NdaFormData): boolean {
  return Boolean(
    data.partyA.name.trim() &&
      data.partyA.address.trim() &&
      data.partyB.name.trim() &&
      data.partyB.address.trim() &&
      data.effectiveDate &&
      data.purpose.trim() &&
      parseTermYears(data.termYears) !== null &&
      data.governingState.trim()
  );
}
