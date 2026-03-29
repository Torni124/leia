import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";
import { main } from "../src/cli";

const validSpec = `job GenerateJsonReport
target python cli

inputs:
  sourcePath: string
  outputPath: string

outputs:
  exitCode: int

rules:
  export a function generate_report(source_path: str, output_path: str) -> int

tests:
  valid input writes output file
`;

test("treats a bare .leia file path as a handoff command", () => {
  const workspaceTempRoot = resolve(".tmp");
  mkdirSync(workspaceTempRoot, { recursive: true });
  const tempRoot = mkdtempSync(join(workspaceTempRoot, "leia-cli-"));

  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdoutChunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    return true;
  }) as typeof process.stdout.write;

  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderrChunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    return true;
  }) as typeof process.stderr.write;

  try {
    const specPath = join(tempRoot, "generate-json-report.leia");
    const outPath = join(tempRoot, "generate-json-report.prompt.txt");
    writeFileSync(specPath, validSpec, "utf8");

    const exitCode = main([specPath]);

    assert.equal(exitCode, 0);
    assert.equal(stderrChunks.join(""), "");
    assert.equal(stdoutChunks.join("").trim(), outPath);
    assert.match(
      readFileSync(outPath, "utf8"),
      /You are a coding model implementing a job from a strict compiled Leia contract\./
    );
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
