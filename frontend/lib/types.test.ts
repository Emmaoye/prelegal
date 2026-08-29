import { describe, expect, it } from "vitest";
import { emptyNdaFormData, isNdaFormComplete, NdaFormData, parseTermYears } from "./types";

const completeData: NdaFormData = {
  partyA: { name: "Acme Robotics, Inc.", address: "500 Market St" },
  partyB: { name: "Beta Innovations LLC", address: "200 Elm Ave" },
  effectiveDate: "2026-09-01",
  purpose: "evaluating a partnership",
  termYears: "2",
  governingState: "Delaware",
};

describe("parseTermYears", () => {
  it("parses a positive integer string", () => {
    expect(parseTermYears("5")).toBe(5);
  });

  it("returns null for zero", () => {
    expect(parseTermYears("0")).toBeNull();
  });

  it("returns null for a negative number", () => {
    expect(parseTermYears("-3")).toBeNull();
  });

  it("returns null for a decimal", () => {
    expect(parseTermYears("1.5")).toBeNull();
  });

  it("returns null for non-numeric text", () => {
    expect(parseTermYears("abc")).toBeNull();
  });

  it("returns null for an empty or whitespace-only string", () => {
    expect(parseTermYears("")).toBeNull();
    expect(parseTermYears("   ")).toBeNull();
  });

  it("tolerates surrounding whitespace around a valid number", () => {
    expect(parseTermYears(" 5 ")).toBe(5);
  });
});

describe("isNdaFormComplete", () => {
  it("is false for the empty form", () => {
    expect(isNdaFormComplete(emptyNdaFormData)).toBe(false);
  });

  it("is true when every field is filled with a valid term", () => {
    expect(isNdaFormComplete(completeData)).toBe(true);
  });

  it.each([
    ["partyA.name", { ...completeData, partyA: { ...completeData.partyA, name: "" } }],
    ["partyA.address", { ...completeData, partyA: { ...completeData.partyA, address: "  " } }],
    ["partyB.name", { ...completeData, partyB: { ...completeData.partyB, name: "" } }],
    ["partyB.address", { ...completeData, partyB: { ...completeData.partyB, address: "" } }],
    ["effectiveDate", { ...completeData, effectiveDate: "" }],
    ["purpose", { ...completeData, purpose: "   " }],
    ["governingState", { ...completeData, governingState: "" }],
  ])("is false when %s is missing or whitespace-only", (_field, data) => {
    expect(isNdaFormComplete(data as NdaFormData)).toBe(false);
  });

  it.each(["0", "-1", "abc", ""])(
    "is false when termYears is invalid (%j)",
    (termYears) => {
      expect(isNdaFormComplete({ ...completeData, termYears })).toBe(false);
    }
  );
});
