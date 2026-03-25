import assert from "node:assert/strict";
import test from "node:test";
import { parseSource } from "../src/parser";
import { renderPrompt } from "../src/prompt";

const pythonCliSpec = `job GenerateJsonReport
target python cli

inputs:
  sourcePath: string
  outputPath: string

outputs:
  exitCode: int

rules:
  export a function generate_report(source_path: str, output_path: str) -> int
  support CLI usage as python script_under_test.py <sourcePath> <outputPath>

constraints:
  use only the Python standard library

tests:
  valid input writes output file
`;

const reactSpec = `component UserCard
target react typescript

inputs:
  user: User

rules:
  show the user name

tests:
  renders the user name
`;

test("renders a model-ready prompt for python cli specs", () => {
  const sourceFile = parseSource(pythonCliSpec).sourceFile;
  const prompt = renderPrompt(sourceFile);

  assert.match(prompt, /You are a coding model implementing software from a Leia spec\./);
  assert.match(prompt, /Generate exactly one `\.py` file named `script_under_test\.py`\./);
  assert.match(prompt, /Return `0` on success and a non-zero integer on failure/);
  assert.match(prompt, /Leia spec:\njob GenerateJsonReport/);
  assert.match(prompt, /export a function generate_report/);
});

test("renders a target-aware prompt for react specs", () => {
  const sourceFile = parseSource(reactSpec).sourceFile;
  const prompt = renderPrompt(sourceFile);

  assert.match(
    prompt,
    /Generate the smallest complete React\/TypeScript implementation that satisfies the spec\./
  );
  assert.doesNotMatch(prompt, /Generate exactly one `\.py` file named `script_under_test\.py`\./);
});
