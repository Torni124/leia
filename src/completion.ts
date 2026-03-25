import {
  DEFAULT_LANGUAGE,
  getSectionSpec,
  isRootKind,
  isSectionKind,
  type FieldSectionKind,
  type LanguageDefinition,
  type RootKind,
  type SectionKind,
  type TextSectionKind
} from "./language";

export interface CompletionPosition {
  readonly line: number;
  readonly character: number;
}

export type CompletionInsertTextFormat = "plain" | "snippet";

export interface CompletionSuggestion {
  readonly label: string;
  readonly kind: "keyword" | "section";
  readonly detail: string;
  readonly documentation: string;
  readonly insertText: string;
  readonly insertTextFormat: CompletionInsertTextFormat;
  readonly filterText?: string;
  readonly sortText?: string;
}

interface TopLevelScanResult {
  readonly hasMeaningfulTopLevelBeforeCurrentLine: boolean;
  readonly hasRootBeforeCurrentLine: boolean;
  readonly hasTargetElsewhere: boolean;
  readonly existingSections: ReadonlySet<SectionKind>;
}

const ROOT_KIND_DOCUMENTATION: Readonly<Record<RootKind, string>> = {
  component: "Declare a UI-facing component intent spec.",
  endpoint: "Declare an API endpoint intent spec.",
  job: "Declare a background or batch job intent spec.",
  module: "Declare a reusable module intent spec."
};

const SECTION_DOCUMENTATION: Readonly<Record<SectionKind, string>> = {
  inputs: "Declare named typed inputs consumed by the root declaration.",
  state: "Declare named typed internal state with optional default values.",
  outputs: "Declare named typed outputs produced by the root declaration.",
  rules: "List hard required behaviors the generated implementation must satisfy.",
  constraints: "List hard restrictions the generated implementation must not violate.",
  preferences: "List soft preferences that guide the implementation when possible.",
  flex: "List areas intentionally left open for the model to decide.",
  tests: "List acceptance criteria that describe the intended observable behavior.",
  imports: "Reserved for future cross-file include or import declarations."
};

export function getCompletionSuggestions(
  text: string,
  position: CompletionPosition,
  language: LanguageDefinition = DEFAULT_LANGUAGE
): CompletionSuggestion[] {
  const lines = splitLines(text);
  const lineIndex = clamp(position.line, 0, Math.max(0, lines.length - 1));
  const lineText = lines[lineIndex] ?? "";
  const character = clamp(position.character, 0, lineText.length);
  const linePrefix = lineText.slice(0, character);

  if (isIndentedLine(lineText) || linePrefix.trimStart().startsWith("#")) {
    return [];
  }

  const wordPrefix = getWordPrefix(linePrefix);
  const scan = scanTopLevelLines(lines, lineIndex, language);

  if (!scan.hasMeaningfulTopLevelBeforeCurrentLine) {
    return filterSuggestions(createRootSuggestions(language), wordPrefix);
  }

  if (!scan.hasRootBeforeCurrentLine) {
    return [];
  }

  const suggestions: CompletionSuggestion[] = [];

  if (!scan.hasTargetElsewhere) {
    suggestions.push(createTargetSuggestion(language));
  }

  for (const section of language.sections) {
    if (!scan.existingSections.has(section.kind)) {
      suggestions.push(createSectionSuggestion(section.kind, language));
    }
  }

  return filterSuggestions(suggestions, wordPrefix);
}

function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isIndentedLine(lineText: string): boolean {
  return /^[ \t]/.test(lineText);
}

function getWordPrefix(linePrefix: string): string {
  const match = /[A-Za-z_][A-Za-z0-9_]*$/.exec(linePrefix);
  return match?.[0] ?? "";
}

function filterSuggestions(
  suggestions: readonly CompletionSuggestion[],
  wordPrefix: string
): CompletionSuggestion[] {
  if (!wordPrefix) {
    return [...suggestions];
  }

  const normalizedPrefix = wordPrefix.toLowerCase();

  return suggestions.filter((suggestion) =>
    (suggestion.filterText ?? suggestion.label).toLowerCase().startsWith(normalizedPrefix)
  );
}

function scanTopLevelLines(
  lines: readonly string[],
  currentLineIndex: number,
  language: LanguageDefinition
): TopLevelScanResult {
  let hasMeaningfulTopLevelBeforeCurrentLine = false;
  let hasRootBeforeCurrentLine = false;
  let hasTargetElsewhere = false;
  const existingSections = new Set<SectionKind>();

  for (const [index, lineText] of lines.entries()) {
    const classification = classifyTopLevelLine(lineText, language);

    if (index < currentLineIndex && classification.kind !== "blank" && classification.kind !== "comment") {
      hasMeaningfulTopLevelBeforeCurrentLine = true;
    }

    if (index < currentLineIndex && classification.kind === "root") {
      hasRootBeforeCurrentLine = true;
    }

    if (index === currentLineIndex) {
      continue;
    }

    if (classification.kind === "target") {
      hasTargetElsewhere = true;
    }

    if (classification.kind === "section") {
      existingSections.add(classification.sectionKind);
    }
  }

  return {
    hasMeaningfulTopLevelBeforeCurrentLine,
    hasRootBeforeCurrentLine,
    hasTargetElsewhere,
    existingSections
  };
}

function classifyTopLevelLine(
  lineText: string,
  language: LanguageDefinition
):
  | { readonly kind: "blank" | "comment" | "unknown" }
  | { readonly kind: "root" | "target" }
  | { readonly kind: "section"; readonly sectionKind: SectionKind } {
  if (lineText.trim() === "") {
    return { kind: "blank" };
  }

  if (isIndentedLine(lineText)) {
    return { kind: "unknown" };
  }

  const trimmed = lineText.trim();

  if (trimmed.startsWith("#")) {
    return { kind: "comment" };
  }

  if (trimmed.endsWith(":")) {
    const sectionCandidate = trimmed.slice(0, -1).trim();

    if (isSectionKind(sectionCandidate, language)) {
      return {
        kind: "section",
        sectionKind: sectionCandidate
      };
    }
  }

  const firstWord = trimmed.match(/^[A-Za-z_][A-Za-z0-9_]*/)?.[0];

  if (!firstWord) {
    return { kind: "unknown" };
  }

  if (firstWord === language.targetKeyword) {
    return { kind: "target" };
  }

  if (isRootKind(firstWord, language)) {
    return { kind: "root" };
  }

  return { kind: "unknown" };
}

function createRootSuggestions(language: LanguageDefinition): CompletionSuggestion[] {
  return language.rootKinds.map((kind, index) => ({
    label: kind,
    kind: "keyword",
    detail: `${capitalize(kind)} declaration`,
    documentation: ROOT_KIND_DOCUMENTATION[kind],
    insertText: `${kind} \${1:Name}`,
    insertTextFormat: "snippet",
    filterText: kind,
    sortText: `0${index}`
  }));
}

function createTargetSuggestion(language: LanguageDefinition): CompletionSuggestion {
  return {
    label: language.targetKeyword,
    kind: "keyword",
    detail: "Target declaration",
    documentation: "Declare the execution or output target for this Leia spec.",
    insertText: `${language.targetKeyword} \${1:platform}`,
    insertTextFormat: "snippet",
    filterText: language.targetKeyword,
    sortText: "10"
  };
}

function createSectionSuggestion(
  kind: SectionKind,
  language: LanguageDefinition
): CompletionSuggestion {
  const spec = getSectionSpec(kind, language);

  return {
    label: `${kind}:`,
    kind: "section",
    detail:
      spec.contentKind === "fields" ? "Field section" : "Text section",
    documentation: SECTION_DOCUMENTATION[kind],
    insertText:
      spec.contentKind === "fields"
        ? createFieldSectionSnippet(kind as FieldSectionKind)
        : createTextSectionSnippet(kind as TextSectionKind),
    insertTextFormat: "snippet",
    filterText: kind,
    sortText: `2${language.sections.findIndex((section) => section.kind === kind)}`
  };
}

function createFieldSectionSnippet(kind: FieldSectionKind): string {
  const placeholderByKind: Readonly<Record<FieldSectionKind, string>> = {
    inputs: "${1:name}: ${2:Type}",
    state: "${1:name}: ${2:Type} = ${3:defaultValue}",
    outputs: "${1:name}: ${2:Type}"
  };

  return `${kind}:\n  ${placeholderByKind[kind]}`;
}

function createTextSectionSnippet(kind: TextSectionKind): string {
  const placeholderByKind: Readonly<Record<TextSectionKind, string>> = {
    rules: "${1:describe required behavior}",
    constraints: "${1:describe hard restriction}",
    preferences: "${1:describe soft preference}",
    flex: "${1:describe an intentionally flexible area}",
    tests: "${1:describe an acceptance criterion}",
    imports: "${1:describe a future import or include}"
  };

  return `${kind}:\n  ${placeholderByKind[kind]}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
