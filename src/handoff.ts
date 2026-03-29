import { writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { SourceFile } from "./ast";
import { renderPrompt, type PromptStyle } from "./prompt";

export interface HandoffWriteOptions {
  readonly outFile?: string;
  readonly includeSourceAppendix?: boolean;
  readonly style?: PromptStyle;
}

export function getDefaultHandoffPath(specFilePath: string): string {
  const specDir = dirname(specFilePath);
  const specBaseName = basename(specFilePath, ".leia");
  return join(specDir, `${specBaseName}.prompt.txt`);
}

export function writeHandoffFile(
  sourceFile: SourceFile,
  specFilePath: string,
  options: HandoffWriteOptions = {}
): string {
  const outFile = options.outFile ?? getDefaultHandoffPath(specFilePath);
  const prompt = `${renderPrompt(sourceFile, {
    ...(options.style === undefined ? {} : { style: options.style }),
    ...(options.includeSourceAppendix === undefined
      ? {}
      : { includeSourceAppendix: options.includeSourceAppendix })
  })}\n`;
  writeFileSync(outFile, prompt, "utf8");
  return outFile;
}
