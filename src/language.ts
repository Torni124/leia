export const DEFAULT_INDENT_UNIT = 2;

export const ROOT_KINDS = ["component", "endpoint", "job", "module"] as const;
export type RootKind = (typeof ROOT_KINDS)[number];

export const FIELD_SECTION_KINDS = ["inputs", "state", "outputs"] as const;
export type FieldSectionKind = (typeof FIELD_SECTION_KINDS)[number];

export const TEXT_SECTION_KINDS = [
  "rules",
  "constraints",
  "preferences",
  "flex",
  "tests",
  "imports"
] as const;
export type TextSectionKind = (typeof TEXT_SECTION_KINDS)[number];

export const SECTION_KINDS = [...FIELD_SECTION_KINDS, ...TEXT_SECTION_KINDS] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

export type SectionContentKind = "fields" | "text";

export interface SectionSpec {
  readonly kind: SectionKind;
  readonly contentKind: SectionContentKind;
  readonly unique: boolean;
}

export interface LanguageDefinition {
  readonly name: string;
  readonly fileExtension: string;
  readonly indentUnit: number;
  readonly targetKeyword: string;
  readonly rootKinds: readonly RootKind[];
  readonly sections: readonly SectionSpec[];
}

export const DEFAULT_LANGUAGE: LanguageDefinition = {
  name: "Leia",
  fileExtension: ".leia",
  indentUnit: DEFAULT_INDENT_UNIT,
  targetKeyword: "target",
  rootKinds: ROOT_KINDS,
  sections: [
    { kind: "inputs", contentKind: "fields", unique: true },
    { kind: "state", contentKind: "fields", unique: true },
    { kind: "outputs", contentKind: "fields", unique: true },
    { kind: "rules", contentKind: "text", unique: true },
    { kind: "constraints", contentKind: "text", unique: true },
    { kind: "preferences", contentKind: "text", unique: true },
    { kind: "flex", contentKind: "text", unique: true },
    { kind: "tests", contentKind: "text", unique: true },
    { kind: "imports", contentKind: "text", unique: true }
  ]
};

export function isRootKind(
  text: string,
  language: LanguageDefinition = DEFAULT_LANGUAGE
): text is RootKind {
  return language.rootKinds.includes(text as RootKind);
}

export function isSectionKind(
  text: string,
  language: LanguageDefinition = DEFAULT_LANGUAGE
): text is SectionKind {
  return language.sections.some((section) => section.kind === text);
}

export function getSectionSpec(
  kind: SectionKind,
  language: LanguageDefinition = DEFAULT_LANGUAGE
): SectionSpec {
  const spec = language.sections.find((section) => section.kind === kind);

  if (!spec) {
    throw new Error(`Unknown section kind: ${kind}`);
  }

  return spec;
}

export function getSectionOrder(
  language: LanguageDefinition = DEFAULT_LANGUAGE
): readonly SectionKind[] {
  return language.sections.map((section) => section.kind);
}

export function isIdentifierText(text: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(text);
}
