import { describe, expect, it } from "vitest";
import {
  hasUnsupportedPdfCharacters,
  ndaFormHasUnsupportedPdfCharacters,
} from "./pdf-font-support";
import { emptyNdaFormData, NdaFormData } from "./types";

describe("hasUnsupportedPdfCharacters", () => {
  it("is false for plain ASCII", () => {
    expect(hasUnsupportedPdfCharacters("Acme Robotics, Inc.")).toBe(false);
  });

  it("is false for accented Latin characters", () => {
    expect(hasUnsupportedPdfCharacters("Société Générale")).toBe(false);
  });

  it("is false for Cyrillic text", () => {
    expect(hasUnsupportedPdfCharacters("ООО Ромашка")).toBe(false);
  });

  it("is false for Greek text", () => {
    expect(hasUnsupportedPdfCharacters("Ελληνική Εταιρεία")).toBe(false);
  });

  it("is false for Vietnamese text", () => {
    expect(hasUnsupportedPdfCharacters("Công ty TNHH Việt Nam")).toBe(false);
  });

  it("is true for CJK text", () => {
    expect(hasUnsupportedPdfCharacters("北京示例有限公司")).toBe(true);
  });

  it("is true for Arabic text", () => {
    expect(hasUnsupportedPdfCharacters("شركة المثال")).toBe(true);
  });

  it("is true when only one character out of many is unsupported", () => {
    expect(hasUnsupportedPdfCharacters("Acme Robotics 株式会社")).toBe(true);
  });

  it("is false for an empty string", () => {
    expect(hasUnsupportedPdfCharacters("")).toBe(false);
  });
});

describe("ndaFormHasUnsupportedPdfCharacters", () => {
  it("is false for the empty form", () => {
    expect(ndaFormHasUnsupportedPdfCharacters(emptyNdaFormData)).toBe(false);
  });

  it("is true when only the Party B address contains unsupported characters", () => {
    const data: NdaFormData = {
      ...emptyNdaFormData,
      partyB: { ...emptyNdaFormData.partyB, address: "東城区123号" },
    };
    expect(ndaFormHasUnsupportedPdfCharacters(data)).toBe(true);
  });

  it("is true when the purpose field contains unsupported characters", () => {
    const data: NdaFormData = { ...emptyNdaFormData, purpose: "共同開発の評価" };
    expect(ndaFormHasUnsupportedPdfCharacters(data)).toBe(true);
  });

  it("is false when every field is supported Latin/Cyrillic/Greek text", () => {
    const data: NdaFormData = {
      partyA: { name: "Société Générale", address: "29 Boulevard Haussmann" },
      partyB: { name: "ООО Ромашка", address: "Москва" },
      effectiveDate: "2026-09-01",
      purpose: "evaluating a partnership",
      termYears: "2",
      governingState: "Delaware",
    };
    expect(ndaFormHasUnsupportedPdfCharacters(data)).toBe(false);
  });
});
