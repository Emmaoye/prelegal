import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import NdaPreview from "./NdaPreview";
import { emptyNdaFormData, NdaFormData } from "@/lib/types";
import { NDA_DISCLAIMER, NDA_TITLE } from "@/lib/nda-template";

const filledData: NdaFormData = {
  partyA: { name: "Acme Robotics, Inc.", address: "500 Market St" },
  partyB: { name: "Beta Innovations LLC", address: "200 Elm Ave" },
  effectiveDate: "2026-09-01",
  purpose: "evaluating a partnership",
  termYears: "3",
  governingState: "Delaware",
};

describe("NdaPreview", () => {
  it("renders the document title and disclaimer", () => {
    render(<NdaPreview data={emptyNdaFormData} />);
    expect(screen.getByRole("heading", { name: NDA_TITLE })).toBeInTheDocument();
    expect(screen.getByText(NDA_DISCLAIMER)).toBeInTheDocument();
  });

  it("renders all nine clause headings", () => {
    render(<NdaPreview data={emptyNdaFormData} />);
    for (const heading of [
      "1. Purpose",
      "2. Definition of Confidential Information",
      "3. Obligations of Receiving Party",
      "4. Exclusions",
      "5. Term",
      "6. Return or Destruction of Materials",
      "7. No License",
      "8. Governing Law",
      "9. Entire Agreement",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
  });

  it("shows placeholder party names in the signature block when empty", () => {
    render(<NdaPreview data={emptyNdaFormData} />);
    expect(screen.getByText("Party A")).toBeInTheDocument();
    expect(screen.getByText("Party B")).toBeInTheDocument();
  });

  it("shows real party names in the signature block once filled in", () => {
    render(<NdaPreview data={filledData} />);
    expect(screen.getByText("Acme Robotics, Inc.")).toBeInTheDocument();
    expect(screen.getByText("Beta Innovations LLC")).toBeInTheDocument();
    // interpolated into the intro paragraph too
    expect(screen.getByText(/500 Market St/)).toBeInTheDocument();
    expect(screen.getByText(/September 1, 2026/)).toBeInTheDocument();
  });
});
