import type { FieldEntry, Section, SourceFile, TextItem } from "./ast";
import {
  DEFAULT_LANGUAGE,
  getSectionOrder,
  type LanguageDefinition,
  type SectionKind
} from "./language";

export function formatSourceFile(
  sourceFile: SourceFile,
  language: LanguageDefinition = DEFAULT_LANGUAGE
): string {
  const root = sourceFile.root;

  if (!root) {
    return "";
  }

  const lines: string[] = [];
  lines.push(root.name ? `${root.kind} ${root.name.text}` : root.kind);

  if (root.target) {
    lines.push(`target ${root.target.parts.join(" ")}`.trimEnd());
  }

  const orderedSections = sortSections(root.sections, language);

  if (orderedSections.length > 0) {
    lines.push("");
  }

  orderedSections.forEach((section, index) => {
    if (index > 0) {
      lines.push("");
    }

    lines.push(`${section.kind}:`);

    if (section.kind === "inputs" || section.kind === "state" || section.kind === "outputs") {
      for (const field of section.content as FieldEntry[]) {
        lines.push(`  ${formatField(field)}`);
      }
      return;
    }

    for (const item of section.content as TextItem[]) {
      lines.push(`  ${item.text}`);
    }
  });

  return `${lines.map((line) => line.replace(/[ \t]+$/u, "")).join("\n")}\n`;
}

function sortSections(
  sections: readonly Section[],
  language: LanguageDefinition
): Section[] {
  const order = new Map<SectionKind, number>();
  getSectionOrder(language).forEach((kind, index) => {
    order.set(kind, index);
  });

  return [...sections].sort((left, right) => {
    const leftIndex = order.get(left.kind) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = order.get(right.kind) ?? Number.MAX_SAFE_INTEGER;

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return left.span.start - right.span.start;
  });
}

function formatField(field: FieldEntry): string {
  const base = `${field.name.text}: ${field.typeText}`;
  return field.defaultValueText === null ? base : `${base} = ${field.defaultValueText}`;
}
