import type { SourceFile } from "./ast";
import type { Diagnostic } from "./diagnostics";
import { DEFAULT_LANGUAGE, type LanguageDefinition } from "./language";
import { parseSource, type ParseResult } from "./parser";
import { validateSourceFile } from "./validator";

export interface AnalysisResult {
  readonly sourceFile: SourceFile;
  readonly diagnostics: Diagnostic[];
  readonly parseDiagnostics: Diagnostic[];
  readonly validationDiagnostics: Diagnostic[];
  readonly parseResult: ParseResult;
}

export function analyzeSource(
  text: string,
  language: LanguageDefinition = DEFAULT_LANGUAGE
): AnalysisResult {
  const parseResult = parseSource(text, language);
  const validationDiagnostics = validateSourceFile(parseResult.sourceFile, language);

  return {
    sourceFile: parseResult.sourceFile,
    diagnostics: [...parseResult.diagnostics, ...validationDiagnostics],
    parseDiagnostics: parseResult.diagnostics,
    validationDiagnostics,
    parseResult
  };
}
