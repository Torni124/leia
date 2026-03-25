import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { hasErrors } from "../src/diagnostics";
import { parseSource } from "../src/parser";

const validExample = `component UserCard
target react typescript

inputs:
  user: User
  onSelect: fn(id: string) -> void

state:
  expanded: bool = false

outputs:
  render: JSX.Element

rules:
  show avatar, name, and email
  clicking card calls onSelect(user.id)

constraints:
  no external dependencies
  use functional components

preferences:
  prefer small helper functions

flex:
  helper names
  internal decomposition

tests:
  clicking card calls onSelect once
`;

const endpointExample = `endpoint GetUser
target python fastapi

inputs:
  id: uuid

outputs:
  response: User | NotFound

rules:
  fetch user by id
  return not found when user missing
  require auth

constraints:
  no raw SQL
  use async

tests:
  missing user returns not found
  valid user returns user record
`;

test("parses a valid Leia file", () => {
  const result = parseSource(validExample);

  assert.equal(hasErrors(result.diagnostics), false);
  assert.ok(result.sourceFile.root);
  assert.equal(result.sourceFile.root?.kind, "component");
  assert.equal(result.sourceFile.root?.name?.text, "UserCard");
  assert.deepEqual(result.sourceFile.root?.target?.parts, ["react", "typescript"]);
  assert.equal(result.sourceFile.root?.sections.length, 8);
});

test("parses the endpoint example", () => {
  const result = parseSource(endpointExample);

  assert.equal(hasErrors(result.diagnostics), false);
  assert.equal(result.sourceFile.root?.kind, "endpoint");
  assert.equal(result.sourceFile.root?.name?.text, "GetUser");
  assert.deepEqual(result.sourceFile.root?.target?.parts, ["python", "fastapi"]);
});

test("parses the generated JSON report Python example file", () => {
  const filePath = resolve(__dirname, "..", "..", "examples", "generate-json-report.leia");
  const result = parseSource(readFileSync(filePath, "utf8"));

  assert.equal(hasErrors(result.diagnostics), false);
  assert.equal(result.sourceFile.root?.kind, "job");
  assert.equal(result.sourceFile.root?.name?.text, "GenerateJsonReport");
  assert.deepEqual(result.sourceFile.root?.target?.parts, ["python", "cli"]);
});

test("parses the normalize-users Python example file", () => {
  const filePath = resolve(__dirname, "..", "..", "examples", "normalize-users.leia");
  const result = parseSource(readFileSync(filePath, "utf8"));

  assert.equal(hasErrors(result.diagnostics), false);
  assert.equal(result.sourceFile.root?.kind, "job");
  assert.equal(result.sourceFile.root?.name?.text, "NormalizeUsers");
  assert.deepEqual(result.sourceFile.root?.target?.parts, ["python", "cli"]);
});

test("reports bad indentation width", () => {
  const source = `component UserCard
target react typescript

inputs:
   user: User
`;
  const result = parseSource(source);

  assert.equal(
    result.diagnostics.some((diagnostic) => diagnostic.code === "syntax.invalid_indentation_width"),
    true
  );
});

test("reports tabs in indentation", () => {
  const source = "component UserCard\ntarget react typescript\n\ninputs:\n\tuser: User\n";
  const result = parseSource(source);

  assert.equal(
    result.diagnostics.some((diagnostic) => diagnostic.code === "syntax.tabs_not_allowed"),
    true
  );
});

test("reports unknown sections", () => {
  const source = `component UserCard
target react typescript

unknown:
  thing
`;
  const result = parseSource(source);

  assert.equal(
    result.diagnostics.some((diagnostic) => diagnostic.code === "semantic.unknown_section"),
    true
  );
});

test("reports malformed field lines", () => {
  const source = `component UserCard
target react typescript

inputs:
  user User
`;
  const result = parseSource(source);

  assert.equal(
    result.diagnostics.some((diagnostic) => diagnostic.code === "syntax.malformed_field_entry"),
    true
  );
});

test("parses freeform rules from plain and dash-prefixed lines", () => {
  const source = `endpoint GetUser
target python fastapi

rules:
  fetch user by id
  - return not found when user missing
  - require auth
`;
  const result = parseSource(source);
  const rulesSection = result.sourceFile.root?.sections.find((section) => section.kind === "rules");

  assert.ok(rulesSection);
  assert.deepEqual(
    rulesSection?.content.map((item) => ("text" in item ? item.text : null)),
    ["fetch user by id", "return not found when user missing", "require auth"]
  );
});
