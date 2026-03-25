import type { SourceSpan } from "./span";

export type DiagnosticSeverity = "error" | "warning";

export interface DiagnosticRelatedInformation {
  readonly message: string;
  readonly span: SourceSpan;
}

export interface Diagnostic {
  readonly severity: DiagnosticSeverity;
  readonly code: string;
  readonly message: string;
  readonly span: SourceSpan;
  readonly relatedInformation?: readonly DiagnosticRelatedInformation[];
  readonly fixHint?: string;
}

export interface DiagnosticInit {
  readonly severity: DiagnosticSeverity;
  readonly code: string;
  readonly message: string;
  readonly span: SourceSpan;
  readonly relatedInformation?: readonly DiagnosticRelatedInformation[];
  readonly fixHint?: string;
}

export function createDiagnostic(init: DiagnosticInit): Diagnostic {
  return {
    severity: init.severity,
    code: init.code,
    message: init.message,
    span: init.span,
    ...(init.relatedInformation ? { relatedInformation: init.relatedInformation } : {}),
    ...(init.fixHint ? { fixHint: init.fixHint } : {})
  };
}

export class DiagnosticBag {
  private readonly diagnostics: Diagnostic[] = [];

  add(diagnostic: Diagnostic): void {
    this.diagnostics.push(diagnostic);
  }

  error(
    code: string,
    message: string,
    span: SourceSpan,
    options?: Pick<DiagnosticInit, "relatedInformation" | "fixHint">
  ): void {
    this.add(createDiagnostic({
      severity: "error",
      code,
      message,
      span,
      ...(options?.relatedInformation ? { relatedInformation: options.relatedInformation } : {}),
      ...(options?.fixHint ? { fixHint: options.fixHint } : {})
    }));
  }

  warning(
    code: string,
    message: string,
    span: SourceSpan,
    options?: Pick<DiagnosticInit, "relatedInformation" | "fixHint">
  ): void {
    this.add(createDiagnostic({
      severity: "warning",
      code,
      message,
      span,
      ...(options?.relatedInformation ? { relatedInformation: options.relatedInformation } : {}),
      ...(options?.fixHint ? { fixHint: options.fixHint } : {})
    }));
  }

  extend(diagnostics: readonly Diagnostic[]): void {
    this.diagnostics.push(...diagnostics);
  }

  toArray(): Diagnostic[] {
    return [...this.diagnostics];
  }
}

export function hasErrors(diagnostics: readonly Diagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

export function formatDiagnostic(diagnostic: Diagnostic, filePath?: string): string {
  const location = `${diagnostic.span.startLine}:${diagnostic.span.startColumn}`;
  const header = `${diagnostic.severity.toUpperCase()} [${diagnostic.code}] ${
    filePath ? `${filePath}:` : ""
  }${location}`;
  const lines = [header, diagnostic.message];

  if (diagnostic.fixHint) {
    lines.push(`Hint: ${diagnostic.fixHint}`);
  }

  if (diagnostic.relatedInformation) {
    for (const related of diagnostic.relatedInformation) {
      lines.push(
        `Related ${related.span.startLine}:${related.span.startColumn}: ${related.message}`
      );
    }
  }

  return lines.join("\n");
}
