import type { Diagnostic } from "./diagnostics";
import type { SourceSpan } from "./span";

export interface LspPosition {
  readonly line: number;
  readonly character: number;
}

export interface LspRange {
  readonly start: LspPosition;
  readonly end: LspPosition;
}

export interface LspRelatedInformation {
  readonly message: string;
  readonly location: {
    readonly uri: string;
    readonly range: LspRange;
  };
}

export interface LspDiagnostic {
  readonly severity: 1 | 2;
  readonly code: string;
  readonly source: "leia";
  readonly message: string;
  readonly range: LspRange;
  readonly relatedInformation?: readonly LspRelatedInformation[];
}

export function sourceSpanToLspRange(span: SourceSpan): LspRange {
  return {
    start: {
      line: Math.max(0, span.startLine - 1),
      character: Math.max(0, span.startColumn - 1)
    },
    end: {
      line: Math.max(0, span.endLine - 1),
      character: Math.max(0, span.endColumn - 1)
    }
  };
}

export function diagnosticToLspDiagnostic(
  diagnostic: Diagnostic,
  uri: string
): LspDiagnostic {
  return {
    severity: diagnostic.severity === "error" ? 1 : 2,
    code: diagnostic.code,
    source: "leia",
    message: diagnostic.fixHint
      ? `${diagnostic.message}\nHint: ${diagnostic.fixHint}`
      : diagnostic.message,
    range: sourceSpanToLspRange(diagnostic.span),
    ...(diagnostic.relatedInformation
      ? {
          relatedInformation: diagnostic.relatedInformation.map((item) => ({
            message: item.message,
            location: {
              uri,
              range: sourceSpanToLspRange(item.span)
            }
          }))
        }
      : {})
  };
}
