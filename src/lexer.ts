import type { CommentLine } from "./ast";
import { DiagnosticBag, type Diagnostic } from "./diagnostics";
import { DEFAULT_LANGUAGE, type LanguageDefinition } from "./language";
import { computeLineStarts, spanFromOffsets, type SourceSpan } from "./span";

export interface LexedLine {
  readonly kind: "blank" | "comment" | "content";
  readonly lineNumber: number;
  readonly rawText: string;
  readonly span: SourceSpan;
  readonly lineSpan: SourceSpan;
  readonly indentText: string;
  readonly indent: number;
  readonly contentText: string;
  readonly contentSpan: SourceSpan | null;
}

export interface LexResult {
  readonly lines: LexedLine[];
  readonly comments: CommentLine[];
  readonly diagnostics: Diagnostic[];
  readonly lineStarts: readonly number[];
}

function detectTabs(text: string): number[] {
  const offsets: number[] = [];

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\t") {
      offsets.push(index);
    }
  }

  return offsets;
}

export function lexSource(
  text: string,
  language: LanguageDefinition = DEFAULT_LANGUAGE
): LexResult {
  const diagnostics = new DiagnosticBag();
  const lineStarts = computeLineStarts(text);
  const lines: LexedLine[] = [];
  const comments: CommentLine[] = [];
  const indentStack = [0];

  for (let lineIndex = 0; lineIndex < lineStarts.length; lineIndex += 1) {
    const start = lineStarts[lineIndex] ?? 0;
    const nextStart = lineStarts[lineIndex + 1] ?? text.length;
    const rawLineWithNewline = text.slice(start, nextStart);
    const rawLine = rawLineWithNewline.endsWith("\n")
      ? rawLineWithNewline.slice(0, -1)
      : rawLineWithNewline;
    const lineSpan = spanFromOffsets(lineStarts, start, nextStart);
    const fullLineSpan = spanFromOffsets(lineStarts, start, start + rawLine.length);
    const firstNonWhitespaceIndex = rawLine.search(/\S/);

    if (firstNonWhitespaceIndex === -1) {
      lines.push({
        kind: "blank",
        lineNumber: lineIndex + 1,
        rawText: rawLine,
        span: fullLineSpan,
        lineSpan,
        indentText: "",
        indent: 0,
        contentText: "",
        contentSpan: null
      });
      continue;
    }

    const indentText = rawLine.slice(0, firstNonWhitespaceIndex);
    const contentText = rawLine.slice(firstNonWhitespaceIndex);
    const indentTabOffsets = detectTabs(indentText);

    for (const tabOffset of indentTabOffsets) {
      diagnostics.error(
        "syntax.tabs_not_allowed",
        "Tabs are not allowed in Leia files.",
        spanFromOffsets(lineStarts, start + tabOffset, start + tabOffset + 1),
        { fixHint: "Replace tabs with spaces using 2 spaces per indentation level." }
      );
    }

    if (indentText.length % language.indentUnit !== 0) {
      diagnostics.error(
        "syntax.invalid_indentation_width",
        `Indentation must use multiples of ${language.indentUnit} spaces.`,
        spanFromOffsets(lineStarts, start, start + indentText.length),
        { fixHint: `Use exactly ${language.indentUnit} spaces for each indentation level.` }
      );
    }

    const contentTabOffsets = detectTabs(contentText);

    for (const tabOffset of contentTabOffsets) {
      diagnostics.error(
        "syntax.tabs_not_allowed",
        "Tabs are not allowed in Leia files.",
        spanFromOffsets(
          lineStarts,
          start + firstNonWhitespaceIndex + tabOffset,
          start + firstNonWhitespaceIndex + tabOffset + 1
        ),
        { fixHint: "Replace tabs with spaces." }
      );
    }

    const indent = Math.floor(indentText.length / language.indentUnit);
    const contentStart = start + firstNonWhitespaceIndex;
    const contentSpan = spanFromOffsets(lineStarts, contentStart, contentStart + contentText.length);

    if (contentText.startsWith("#")) {
      comments.push({
        nodeType: "CommentLine",
        indent,
        text: contentText.slice(1).trim(),
        span: contentSpan
      });
      lines.push({
        kind: "comment",
        lineNumber: lineIndex + 1,
        rawText: rawLine,
        span: fullLineSpan,
        lineSpan,
        indentText,
        indent,
        contentText,
        contentSpan
      });
      continue;
    }

    const currentIndent = indentStack[indentStack.length - 1] ?? 0;

    if (indent > currentIndent + 1) {
      diagnostics.error(
        "syntax.unexpected_indent",
        "Unexpected indentation increase.",
        spanFromOffsets(lineStarts, start, start + indentText.length),
        { fixHint: `Increase indentation by only one level (${language.indentUnit} spaces) at a time.` }
      );
    }

    if (indent > currentIndent) {
      indentStack.push(indent);
    } else if (indent < currentIndent) {
      while (indentStack.length > 0 && (indentStack[indentStack.length - 1] ?? 0) > indent) {
        indentStack.pop();
      }

      if ((indentStack[indentStack.length - 1] ?? 0) !== indent) {
        diagnostics.error(
          "syntax.unexpected_dedent",
          "Unexpected dedent does not match any previous indentation level.",
          spanFromOffsets(lineStarts, start, start + indentText.length),
          {
            fixHint: `Dedent back to a previously used indentation level in multiples of ${language.indentUnit} spaces.`
          }
        );
        indentStack.push(indent);
      }
    }

    lines.push({
      kind: "content",
      lineNumber: lineIndex + 1,
      rawText: rawLine,
      span: fullLineSpan,
      lineSpan,
      indentText,
      indent,
      contentText,
      contentSpan
    });
  }

  return {
    lines,
    comments,
    diagnostics: diagnostics.toArray(),
    lineStarts
  };
}
