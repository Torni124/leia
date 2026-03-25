import type { SourceSpan } from "./span";
import type { FieldSectionKind, RootKind, SectionKind, TextSectionKind } from "./language";

export interface BaseNode {
  readonly span: SourceSpan;
}

export interface Identifier extends BaseNode {
  readonly nodeType: "Identifier";
  readonly text: string;
}

export interface CommentLine extends BaseNode {
  readonly nodeType: "CommentLine";
  readonly indent: number;
  readonly text: string;
}

export interface TargetDecl extends BaseNode {
  readonly nodeType: "TargetDecl";
  readonly parts: string[];
}

export interface FieldEntry extends BaseNode {
  readonly nodeType: "FieldEntry";
  readonly name: Identifier;
  readonly typeText: string;
  readonly typeSpan: SourceSpan;
  readonly defaultValueText: string | null;
  readonly defaultValueSpan: SourceSpan | null;
}

export interface TextItem extends BaseNode {
  readonly nodeType: "TextItem";
  readonly text: string;
}

export interface FieldSection extends BaseNode {
  readonly nodeType: "Section";
  readonly kind: FieldSectionKind;
  readonly content: FieldEntry[];
}

export interface TextSection extends BaseNode {
  readonly nodeType: "Section";
  readonly kind: TextSectionKind;
  readonly content: TextItem[];
}

export type Section = FieldSection | TextSection;

export interface RootDecl extends BaseNode {
  readonly nodeType: "RootDecl";
  readonly kind: RootKind;
  readonly name: Identifier | null;
  readonly target: TargetDecl | null;
  readonly sections: Section[];
}

export interface SourceFile extends BaseNode {
  readonly nodeType: "SourceFile";
  readonly root: RootDecl | null;
  readonly comments: CommentLine[];
}

export function isFieldSection(section: Section): section is FieldSection {
  return section.kind === "inputs" || section.kind === "state" || section.kind === "outputs";
}

export function isTextSection(section: Section): section is TextSection {
  return !isFieldSection(section);
}

export function findSection(sourceFile: SourceFile, kind: SectionKind): Section | undefined {
  return sourceFile.root?.sections.find((section) => section.kind === kind);
}
