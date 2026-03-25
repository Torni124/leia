#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Diagnostic } from "./diagnostics";
import { analyzeSource } from "./analyze";
import { formatDiagnostic, hasErrors } from "./diagnostics";
import { formatSourceFile } from "./formatter";
import { getDefaultHandoffPath, writeHandoffFile } from "./handoff";
import { renderPrompt } from "./prompt";

function main(argv: readonly string[]): number {
  const [command, ...rest] = argv;

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
  const filePath = requireFilePath(args);

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

  process.stdout.write(`${renderPrompt(analysis.sourceFile)}\n`);
  return 0;
}

function runHandoff(args: readonly string[]): number {
  const { filePath, outFile } = parseFileAndOutArgs(args);

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
  writeHandoffFile(analysis.sourceFile, absolutePath, { outFile: resolvedOutFile });
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

function parseFileAndOutArgs(args: readonly string[]): { filePath: string | null; outFile: string | null } {
  let filePath: string | null = null;
  let outFile: string | null = null;

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (value === "--out") {
      outFile = args[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (!filePath) {
      filePath = value ?? null;
    }
  }

  return { filePath, outFile };
}

function emitDiagnostics(diagnostics: readonly Diagnostic[], filePath: string): void {
  for (const diagnostic of diagnostics) {
    process.stderr.write(`${formatDiagnostic(diagnostic, filePath)}\n\n`);
  }
}

function printHelp(): void {
  process.stdout.write(
    [
      "leia check <file>",
      "leia ast <file>",
      "leia format <file> [--write]",
      "leia prompt <file>",
      "leia handoff <file> [--out <file>]"
    ].join("\n") + "\n"
  );
}

process.exitCode = main(process.argv.slice(2));
