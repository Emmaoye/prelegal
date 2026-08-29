import { describe, expect, it } from "vitest";
import { emptyNdaFormData, NdaFormData } from "./types";
import {
  NDA_TITLE,
  formatDisplayDate,
  getIntroParagraph,
  getNdaSections,
} from "./nda-template";

function withData(overrides: Partial<NdaFormData>): NdaFormData {
  return { ...emptyNdaFormData, ...overrides };
}

describe("formatDisplayDate", () => {
  it("returns a placeholder for an empty string", () => {
    expect(formatDisplayDate("")).toBe("[Effective Date]");
  });

  it("returns a placeholder for an unparsable string", () => {
    expect(formatDisplayDate("not-a-date")).toBe("[Effective Date]");
  });

  it("formats a valid ISO date as a long-form US date", () => {
    expect(formatDisplayDate("2026-09-01")).toBe("September 1, 2026");
  });

  it("does not shift the date across a timezone boundary", () => {
    // A naive `new Date("2026-01-01")` parse (UTC midnight) can render as
    // Dec 31 in timezones behind UTC; formatDisplayDate must avoid that.
    expect(formatDisplayDate("2026-01-01")).toBe("January 1, 2026");
  });
});

describe("getIntroParagraph", () => {
  it("fills in placeholders when all fields are empty", () => {
    const paragraph = getIntroParagraph(emptyNdaFormData);
    expect(paragraph).toContain("[Party A Name]");
    expect(paragraph).toContain("[Party A Address]");
    expect(paragraph).toContain("[Party B Name]");
    expect(paragraph).toContain("[Party B Address]");
    expect(paragraph).toContain("[Effective Date]");
  });

  it("interpolates provided party and date data", () => {
    const data = withData({
      partyA: { name: "Acme Robotics, Inc.", address: "500 Market St" },
      partyB: { name: "Beta Innovations LLC", address: "200 Elm Ave" },
      effectiveDate: "2026-09-01",
    });
    const paragraph = getIntroParagraph(data);
    expect(paragraph).toContain("Acme Robotics, Inc.");
    expect(paragraph).toContain("500 Market St");
    expect(paragraph).toContain("Beta Innovations LLC");
    expect(paragraph).toContain("200 Elm Ave");
    expect(paragraph).toContain("September 1, 2026");
  });

  it("treats whitespace-only party names as empty", () => {
    const data = withData({
      partyA: { name: "   ", address: "  " },
    });
    const paragraph = getIntroParagraph(data);
    expect(paragraph).toContain("[Party A Name]");
    expect(paragraph).toContain("[Party A Address]");
  });

  it("preserves non-Latin and accented characters", () => {
    const data = withData({
      partyA: { name: "北京示例有限公司", address: "东城区123号" },
      partyB: { name: "Société Générale", address: "29 Boulevard Haussmann" },
    });
    const paragraph = getIntroParagraph(data);
    expect(paragraph).toContain("北京示例有限公司");
    expect(paragraph).toContain("东城区123号");
    expect(paragraph).toContain("Société Générale");
  });
});

describe("getNdaSections", () => {
  it("falls back to placeholders for purpose, term, and governing state", () => {
    // emptyNdaFormData defaults termYears to "2" (a sensible form default),
    // so override it here to exercise the empty/blank fallback path too.
    const sections = getNdaSections(withData({ termYears: "" }));
    const purposeSection = sections.find((s) => s.heading === "1. Purpose")!;
    const termSection = sections.find((s) => s.heading === "5. Term")!;
    const lawSection = sections.find((s) => s.heading === "8. Governing Law")!;

    expect(purposeSection.body).toContain("[Purpose of Disclosure]");
    expect(termSection.body).toContain("[Term]");
    expect(lawSection.body).toContain("[Governing State]");
  });

  it("interpolates a valid positive integer term", () => {
    const sections = getNdaSections(withData({ termYears: "5" }));
    const termSection = sections.find((s) => s.heading === "5. Term")!;
    expect(termSection.body).toContain("5 year(s)");
  });

  it.each(["0", "-3", "1.5", "abc", "", "  "])(
    "falls back to a placeholder for invalid term %j instead of rendering it raw",
    (termYears) => {
      const sections = getNdaSections(withData({ termYears }));
      const termSection = sections.find((s) => s.heading === "5. Term")!;
      expect(termSection.body).toContain("[Term]");
      if (termYears.trim()) {
        expect(termSection.body).not.toContain(`${termYears} year(s)`);
      }
    }
  );

  it("interpolates purpose and governing state", () => {
    const sections = getNdaSections(
      withData({ purpose: "a joint research project", governingState: "Delaware" })
    );
    const purposeSection = sections.find((s) => s.heading === "1. Purpose")!;
    const lawSection = sections.find((s) => s.heading === "8. Governing Law")!;
    expect(purposeSection.body).toContain("a joint research project");
    expect(lawSection.body).toContain("State of Delaware");
  });

  it("returns all nine standard NDA clauses in order", () => {
    const sections = getNdaSections(emptyNdaFormData);
    expect(sections.map((s) => s.heading)).toEqual([
      "1. Purpose",
      "2. Definition of Confidential Information",
      "3. Obligations of Receiving Party",
      "4. Exclusions",
      "5. Term",
      "6. Return or Destruction of Materials",
      "7. No License",
      "8. Governing Law",
      "9. Entire Agreement",
    ]);
  });
});

describe("NDA_TITLE", () => {
  it("is the expected document title", () => {
    expect(NDA_TITLE).toBe("MUTUAL NON-DISCLOSURE AGREEMENT");
  });
});
