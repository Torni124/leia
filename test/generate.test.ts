import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";
import { parseSource } from "../src/parser";
import {
  extractTextFromAnthropicResponse,
  getDefaultGeneratedArtifactPath,
  sanitizeGeneratedArtifact,
  writeGeneratedArtifactWithAnthropic,
  type AnthropicMessagesClient
} from "../src/generate";

const pythonCliSpec = `job GenerateJsonReport
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

test("derives a sibling generated python path from a python cli spec", () => {
  const sourceFile = parseSource(pythonCliSpec).sourceFile;
  const specPath = resolve("examples", "generate-json-report.leia");

  assert.equal(
    getDefaultGeneratedArtifactPath(sourceFile, specPath),
    resolve("examples", "generate-json-report.generated.py")
  );
});

test("extracts text content from an anthropic message response", () => {
  const text = extractTextFromAnthropicResponse({
    content: [
      { type: "text", text: "print('hello')" },
      { type: "thinking", text: "ignored" },
      { type: "text", text: "\nprint('world')" }
    ]
  });

  assert.equal(text, "print('hello')\nprint('world')");
});

test("sanitizes fenced code responses", () => {
  assert.equal(
    sanitizeGeneratedArtifact("Here you go:\n```python\nprint('hello')\n```\n"),
    "print('hello')\n"
  );
});

test("writes a generated artifact from a fake anthropic client", async () => {
  const workspaceTempRoot = resolve(".tmp");
  mkdirSync(workspaceTempRoot, { recursive: true });
  const tempRoot = mkdtempSync(join(workspaceTempRoot, "leia-generate-"));
  const sourceFile = parseSource(pythonCliSpec).sourceFile;
  const fakeClient: AnthropicMessagesClient = {
    messages: {
      async create() {
        return {
          content: [
            {
              type: "text",
              text: "```python\nprint('hello from anthropic')\n```"
            }
          ]
        };
      }
    }
  };

  try {
    const specPath = join(tempRoot, "generate-json-report.leia");
    const result = await writeGeneratedArtifactWithAnthropic(sourceFile, specPath, {
      client: fakeClient
    });

    assert.equal(result.outFile, join(tempRoot, "generate-json-report.generated.py"));
    assert.equal(readFileSync(result.outFile, "utf8"), "print('hello from anthropic')\n");
    assert.match(result.promptText, /strict compiled Leia contract/i);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
