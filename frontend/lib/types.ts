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

export function isNdaFormComplete(data: NdaFormData): boolean {
  return Boolean(
    data.partyA.name.trim() &&
      data.partyA.address.trim() &&
      data.partyB.name.trim() &&
      data.partyB.address.trim() &&
      data.effectiveDate &&
      data.purpose.trim() &&
      data.termYears.trim() &&
      data.governingState.trim()
  );
}
