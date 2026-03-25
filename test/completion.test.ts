import assert from "node:assert/strict";
import test from "node:test";
import { getCompletionSuggestions } from "../src/completion";

test("suggests root kinds at the beginning of a file", () => {
  const suggestions = getCompletionSuggestions("", { line: 0, character: 0 });
  const labels = suggestions.map((suggestion) => suggestion.label);

  assert.deepEqual(labels, ["component", "endpoint", "job", "module"]);
});

test("filters root kind suggestions by the current prefix", () => {
  const suggestions = getCompletionSuggestions("comp", { line: 0, character: 4 });

  assert.deepEqual(
    suggestions.map((suggestion) => suggestion.label),
    ["component"]
  );
});

test("suggests target and section headers after a root declaration", () => {
  const source = `component UserCard
`;
  const suggestions = getCompletionSuggestions(source, { line: 1, character: 0 });
  const labels = suggestions.map((suggestion) => suggestion.label);

  assert.ok(labels.includes("target"));
  assert.ok(labels.includes("inputs:"));
  assert.ok(labels.includes("rules:"));
});

test("does not suggest duplicate unique sections", () => {
  const source = `component UserCard
target react typescript

inputs:
  user: User

`;
  const suggestions = getCompletionSuggestions(source, { line: 5, character: 0 });
  const labels = suggestions.map((suggestion) => suggestion.label);

  assert.ok(!labels.includes("inputs:"));
  assert.ok(labels.includes("outputs:"));
});

test("does not suggest top-level completions inside indented blocks", () => {
  const source = `component UserCard
target react typescript

inputs:
  user: User
  `;
  const suggestions = getCompletionSuggestions(source, { line: 5, character: 2 });

  assert.equal(suggestions.length, 0);
});

test("filters top-level section suggestions by prefix", () => {
  const source = `component UserCard
target react typescript

ru`;
  const suggestions = getCompletionSuggestions(source, { line: 3, character: 2 });

  assert.deepEqual(
    suggestions.map((suggestion) => suggestion.label),
    ["rules:"]
  );
});
