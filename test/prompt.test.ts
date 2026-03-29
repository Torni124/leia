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

  assert.match(prompt, /You are a coding model implementing a job from a strict compiled Leia contract\./);
  assert.match(prompt, /Generate exactly one `\.py` file named `script_under_test\.py`\./);
  assert.match(prompt, /return `0` on success and a non-zero integer on failure/i);
  assert.match(prompt, /Project:\n- Kind: job\n- Name: GenerateJsonReport\n- Target: python cli/);
  assert.match(prompt, /Inputs:\n- sourcePath: string\n- outputPath: string/);
  assert.match(prompt, /Required Behavior:\n1\. export a function generate_report/);
  assert.doesNotMatch(prompt, /Leia spec:/);
});

test("renders a strict prompt with priority order and forbidden failure modes", () => {
  const sourceFile = parseSource(pythonCliSpec).sourceFile;
  const prompt = renderPrompt(sourceFile, { style: "strict" });

  assert.match(prompt, /strict compiled Leia contract/i);
  assert.match(prompt, /Priority Order:/);
  assert.match(prompt, /Forbidden Failure Modes:/);
  assert.match(prompt, /Do not omit, rename, or weaken any explicitly required export/);
  assert.match(prompt, /Prefer a stable, low-variance implementation shape:/);
  assert.match(prompt, /When flexible areas are declared, keep discretionary variation inside them\./);
  assert.match(prompt, /Final Review Before Responding:/);
  assert.match(prompt, /Review the implementation against each acceptance criterion one by one\./);
  assert.match(
    prompt,
    /Do not respond until you believe the implementation would pass the acceptance tests and reflects strong engineering judgment within the contract\./
  );
});

test("renders an acceptance-first prompt that prioritizes tests", () => {
  const sourceFile = parseSource(pythonCliSpec).sourceFile;
  const prompt = renderPrompt(sourceFile, { style: "acceptance" });

  assert.match(prompt, /Acceptance Gate:/);
  assert.match(prompt, /Final Review Before Responding:/);
  assert.match(prompt, /Behavioral Priorities:/);
  assert.match(prompt, /prefer the most conventional, low-variance design/i);
  assert.match(prompt, /Acceptance Criteria:\n1\. valid input writes output file[\s\S]*Required Behavior:/);
  assert.match(prompt, /Check that validation failures return a non-zero exit code and do not write the output file/i);
});

test("renders a target-aware prompt for react specs", () => {
  const sourceFile = parseSource(reactSpec).sourceFile;
  const prompt = renderPrompt(sourceFile);

  assert.match(
    prompt,
    /Generate the smallest complete React\/TypeScript implementation that satisfies the brief\./
  );
  assert.doesNotMatch(prompt, /Generate exactly one `\.py` file named `script_under_test\.py`\./);
});

test("can include a compiled source appendix when requested", () => {
  const sourceFile = parseSource(reactSpec).sourceFile;
  const prompt = renderPrompt(sourceFile, { includeSourceAppendix: true });

  assert.match(prompt, /Compiled Leia Source Appendix:/);
  assert.match(prompt, /component UserCard/);
  assert.match(prompt, /target react typescript/);
});
