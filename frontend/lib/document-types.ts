export interface TextRun {
  type: "text";
  text: string;
  bold?: boolean;
}

export interface LinkRun {
  type: "link";
  text: string;
  href: string;
  bold?: boolean;
}

export interface FieldRun {
  type: "field";
  key: string;
  label: string;
  possessive?: boolean;
  value: string;
}

export type Run = TextRun | LinkRun | FieldRun;

export interface DocumentBlock {
  level: number;
  marker: string;
  heading: string | null;
  runs: Run[];
}

export interface RenderedDocument {
  slug: string;
  name: string;
  blocks: DocumentBlock[];
}

/** Field values collected so far, keyed by the field keys the backend exposes. */
export type DocumentFields = Record<string, string>;
