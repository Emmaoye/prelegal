import { describe, expect, it } from "vitest";
import {
  documentFieldsHaveUnsupportedPdfCharacters,
  hasUnsupportedPdfCharacters,
} from "./pdf-font-support";

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

describe("documentFieldsHaveUnsupportedPdfCharacters", () => {
  it("is false for an empty fields object", () => {
    expect(documentFieldsHaveUnsupportedPdfCharacters({})).toBe(false);
  });

  it("is true when only one field contains unsupported characters", () => {
    expect(
      documentFieldsHaveUnsupportedPdfCharacters({ party_a_name: "Acme Inc.", party_b_address: "東城区123号" })
    ).toBe(true);
  });

  it("is true when the purpose field contains unsupported characters", () => {
    expect(documentFieldsHaveUnsupportedPdfCharacters({ purpose: "共同開発の評価" })).toBe(true);
  });

  it("is false when every field is supported Latin/Cyrillic/Greek text", () => {
    expect(
      documentFieldsHaveUnsupportedPdfCharacters({
        party_a_name: "Société Générale",
        party_b_name: "ООО Ромашка",
        governing_law: "Delaware",
      })
    ).toBe(false);
  });
});
