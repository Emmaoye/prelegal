import { DocumentFields } from "./document-types";

// Unicode blocks covered by the Noto Sans build registered in
// DocumentPdfDocument.tsx (Latin, Latin Extended, Greek, Cyrillic, Vietnamese,
// plus common punctuation/currency). Characters outside these ranges - CJK,
// Arabic, Hebrew, Thai, etc. - have no glyph in that font and would
// otherwise render as garbled or missing text in the downloaded PDF.
const SUPPORTED_CODE_POINT_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0000, 0x024f], // Basic Latin, Latin-1 Supplement, Latin Extended-A/B
  [0x0370, 0x03ff], // Greek and Coptic
  [0x0400, 0x052f], // Cyrillic, Cyrillic Supplement
  [0x1e00, 0x1eff], // Latin Extended Additional (Vietnamese, etc.)
  [0x2000, 0x206f], // General Punctuation (smart quotes, em dash, etc.)
  [0x20a0, 0x20cf], // Currency Symbols
];

function isSupportedCodePoint(codePoint: number): boolean {
  return SUPPORTED_CODE_POINT_RANGES.some(
    ([start, end]) => codePoint >= start && codePoint <= end
  );
}

export function hasUnsupportedPdfCharacters(text: string): boolean {
  for (const char of text) {
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined && !isSupportedCodePoint(codePoint)) return true;
  }
  return false;
}

export function documentFieldsHaveUnsupportedPdfCharacters(fields: DocumentFields): boolean {
  return Object.values(fields).some(hasUnsupportedPdfCharacters);
}
