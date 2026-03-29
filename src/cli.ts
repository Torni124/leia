#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Diagnostic } from "./diagnostics";
import { analyzeSource } from "./analyze";
import { formatDiagnostic, hasErrors } from "./diagnostics";
import { formatSourceFile } from "./formatter";
import { getDefaultHandoffPath, writeHandoffFile } from "./handoff";
import { PROMPT_STYLES, isPromptStyle, renderPrompt, type PromptStyle } from "./prompt";

export function main(argv: readonly string[]): number {
  const [command, ...rest] = argv;

  if (command && looksLikeLeiaFilePath(command)) {
    return runHandoff(argv);
  }

  switch (command) {
    case "check":
      return runCheck(rest);
    case "ast":
      return runAst(rest);
    case "format":
      return runFormat(rest);
    case "prompt":
      return runPrompt(rest);
    case "handoff":
      return runHandoff(rest);
    case "--help":
    case "-h":
    case undefined:
      printHelp();
      return command ? 0 : 1;
    default:
      process.stderr.write(`Unknown command: ${command}\n\n`);
      printHelp();
      return 1;
  }
}

function looksLikeLeiaFilePath(value: string): boolean {
  return value.toLowerCase().endsWith(".leia");
}

function runCheck(args: readonly string[]): number {
  const filePath = requireFilePath(args);

  if (!filePath) {
    return 1;
  }

  const absolutePath = resolve(filePath);
  const sourceText = readFileSync(absolutePath, "utf8");
  const analysis = analyzeSource(sourceText);

  emitDiagnostics(analysis.diagnostics, absolutePath);
  return hasErrors(analysis.diagnostics) ? 1 : 0;
}

function runAst(args: readonly string[]): number {
  const filePath = requireFilePath(args);

  if (!filePath) {
    return 1;
  }

  const absolutePath = resolve(filePath);
  const sourceText = readFileSync(absolutePath, "utf8");
  const analysis = analyzeSource(sourceText);

  emitDiagnostics(analysis.diagnostics, absolutePath);
  process.stdout.write(`${JSON.stringify(analysis.sourceFile, null, 2)}\n`);
  return hasErrors(analysis.diagnostics) ? 1 : 0;
}

function runFormat(args: readonly string[]): number {
  const write = args.includes("--write");
  const filePath = requireFilePath(args.filter((arg) => arg !== "--write"));

  if (!filePath) {
    return 1;
  }

  const absolutePath = resolve(filePath);
  const sourceText = readFileSync(absolutePath, "utf8");
  const analysis = analyzeSource(sourceText);

  emitDiagnostics(analysis.diagnostics, absolutePath);

  if (hasErrors(analysis.diagnostics)) {
    return 1;
  }

  const formatted = formatSourceFile(analysis.sourceFile);

  if (write) {
    writeFileSync(absolutePath, formatted, "utf8");
    return 0;
  }

  process.stdout.write(formatted);
  return 0;
}

function runPrompt(args: readonly string[]): number {
  const { filePath, includeSourceAppendix, style, error } = parsePromptArgs(args);

  if (error) {
    process.stderr.write(`${error}\n`);
    return 1;
  }

  if (!filePath) {
    return 1;
  }

  const absolutePath = resolve(filePath);
  const sourceText = readFileSync(absolutePath, "utf8");
  const analysis = analyzeSource(sourceText);

  emitDiagnostics(analysis.diagnostics, absolutePath);

  if (hasErrors(analysis.diagnostics)) {
    return 1;
  }

  process.stdout.write(
    `${renderPrompt(analysis.sourceFile, {
      style,
      includeSourceAppendix
    })}\n`
  );
  return 0;
}

function runHandoff(args: readonly string[]): number {
  const { filePath, outFile, includeSourceAppendix, style, error } = parsePromptArgs(args);

  if (error) {
    process.stderr.write(`${error}\n`);
    return 1;
  }

  if (!filePath) {
    process.stderr.write("Expected a file path.\n");
    return 1;
  }

  if (args.includes("--out") && !outFile) {
    process.stderr.write("Expected a file path after --out.\n");
    return 1;
  }

  const absolutePath = resolve(filePath);
  const sourceText = readFileSync(absolutePath, "utf8");
  const analysis = analyzeSource(sourceText);

  emitDiagnostics(analysis.diagnostics, absolutePath);

  if (hasErrors(analysis.diagnostics)) {
    return 1;
  }

  const resolvedOutFile = outFile ? resolve(outFile) : getDefaultHandoffPath(absolutePath);
  writeHandoffFile(analysis.sourceFile, absolutePath, {
    outFile: resolvedOutFile,
    includeSourceAppendix,
    style
  });
  process.stdout.write(`${resolvedOutFile}\n`);
  return 0;
}

function requireFilePath(args: readonly string[]): string | null {
  const filePath = args[0];

  if (!filePath) {
    process.stderr.write("Expected a file path.\n");
    return null;
  }

  return filePath;
}

function parsePromptArgs(args: readonly string[]): {
  filePath: string | null;
  outFile: string | null;
  includeSourceAppendix: boolean;
  style: PromptStyle;
  error: string | null;
} {
  let filePath: string | null = null;
  let outFile: string | null = null;
  let includeSourceAppendix = false;
  let style: PromptStyle = "strict";

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (value === "--with-source") {
      includeSourceAppendix = true;
      continue;
    }

    if (value === "--out") {
      outFile = args[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (value === "--style") {
      const candidate = args[index + 1];

      if (!candidate) {
        return {
          filePath,
          outFile,
          includeSourceAppendix,
          style,
          error: "Expected a prompt style after --style."
        };
      }

      if (!isPromptStyle(candidate)) {
        return {
          filePath,
          outFile,
          includeSourceAppendix,
          style,
          error: `Unknown prompt style: ${candidate}. Expected one of: ${PROMPT_STYLES.join(", ")}.`
        };
      }

      style = candidate;
      index += 1;
      continue;
    }

    if (!filePath) {
      filePath = value ?? null;
    }
  }

  return { filePath, outFile, includeSourceAppendix, style, error: null };
}

function emitDiagnostics(diagnostics: readonly Diagnostic[], filePath: string): void {
  for (const diagnostic of diagnostics) {
    process.stderr.write(`${formatDiagnostic(diagnostic, filePath)}\n\n`);
  }
}

function printHelp(): void {
  process.stdout.write(
    [
      "leia <file.leia>                           # write a sibling .prompt.txt handoff file",
      "leia check <file>",
      "leia ast <file>",
      "leia format <file> [--write]",
      `leia prompt <file> [--style <${PROMPT_STYLES.join("|")}>] [--with-source]`,
      `leia handoff <file> [--out <file>] [--style <${PROMPT_STYLES.join("|")}>] [--with-source]`
    ].join("\n") + "\n"
  );
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
