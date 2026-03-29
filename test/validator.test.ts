import assert from "node:assert/strict";
import test from "node:test";
import { parseSource } from "../src/parser";
import { validateSourceFile } from "../src/validator";

test("reports missing target", () => {
  const source = `component UserCard

inputs:
  user: User
`;
  const parsed = parseSource(source);
  const diagnostics = validateSourceFile(parsed.sourceFile);

  assert.equal(
    diagnostics.some((diagnostic) => diagnostic.code === "semantic.missing_target"),
    true
  );
});

test("reports duplicate section", () => {
  const source = `component UserCard
target react typescript

inputs:
  user: User

inputs:
  otherUser: User
`;
  const parsed = parseSource(source);
  const diagnostics = validateSourceFile(parsed.sourceFile);

  assert.equal(
    diagnostics.some((diagnostic) => diagnostic.code === "semantic.duplicate_section"),
    true
  );
});

test("reports duplicate field in inputs", () => {
  const source = `component UserCard
target react typescript

inputs:
  user: User
  user: Admin
`;
  const parsed = parseSource(source);
  const diagnostics = validateSourceFile(parsed.sourceFile);

  assert.equal(
    diagnostics.some((diagnostic) => diagnostic.code === "semantic.duplicate_field"),
    true
  );
});

test("does not warn when flex is omitted", () => {
  const source = `component UserCard
target react typescript

rules:
  show avatar

tests:
  renders avatar
`;
  const parsed = parseSource(source);
  const diagnostics = validateSourceFile(parsed.sourceFile);

  assert.equal(
    diagnostics.some((diagnostic) => diagnostic.code === "semantic.missing_flex"),
    false
  );
});
