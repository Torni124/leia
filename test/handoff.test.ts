import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";
import { parseSource } from "../src/parser";
import { getDefaultHandoffPath, writeHandoffFile } from "../src/handoff";

const pythonCliSpec = `job GenerateJsonReport
target python cli

inputs:
  sourcePath: string
  outputPath: string

outputs:
  exitCode: int

rules:
  export a function generate_report(source_path: str, output_path: str) -> int

constraints:
  use only the Python standard library

tests:
  valid input writes output file
`;

test("derives a sibling prompt file path from a leia spec path", () => {
  const specPath = resolve("examples", "generate-json-report.leia");
  const handoffPath = getDefaultHandoffPath(specPath);

  assert.equal(handoffPath, resolve("examples", "generate-json-report.prompt.txt"));
});

test("writes a complete handoff file", () => {
  const workspaceTempRoot = resolve(".tmp");
  mkdirSync(workspaceTempRoot, { recursive: true });
  const tempRoot = mkdtempSync(join(workspaceTempRoot, "leia-handoff-"));

  try {
    const specPath = join(tempRoot, "generate-json-report.leia");
    const outPath = join(tempRoot, "handoff.txt");
    const sourceFile = parseSource(pythonCliSpec).sourceFile;
    const writtenPath = writeHandoffFile(sourceFile, specPath, { outFile: outPath });
    const handoffText = readFileSync(outPath, "utf8");

    assert.equal(writtenPath, outPath);
    assert.match(handoffText, /You are a coding model implementing a job from a strict compiled Leia contract\./);
    assert.match(handoffText, /Generate exactly one `\.py` file named `script_under_test\.py`\./);
    assert.match(handoffText, /Required Behavior:\n1\. export a function generate_report/);
    assert.doesNotMatch(handoffText, /Leia spec:/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("writes a styled handoff file when requested", () => {
  const workspaceTempRoot = resolve(".tmp");
  mkdirSync(workspaceTempRoot, { recursive: true });
  const tempRoot = mkdtempSync(join(workspaceTempRoot, "leia-handoff-style-"));

  try {
    const specPath = join(tempRoot, "generate-json-report.leia");
    const outPath = join(tempRoot, "handoff.txt");
    const sourceFile = parseSource(pythonCliSpec).sourceFile;

    writeHandoffFile(sourceFile, specPath, { outFile: outPath, style: "strict" });

    const handoffText = readFileSync(outPath, "utf8");
    assert.match(handoffText, /Priority Order:/);
    assert.match(handoffText, /Forbidden Failure Modes:/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
