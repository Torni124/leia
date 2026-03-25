import assert from "node:assert/strict";
import test from "node:test";
import { formatSourceFile } from "../src/formatter";
import { parseSource } from "../src/parser";

const messySource = `component UserCard
target react typescript    

tests:
  clicking card calls onSelect once

inputs:
  user: User    
  onSelect: fn(id: string) -> void
rules:
  - show avatar, name, and email
  clicking card calls onSelect(user.id)

constraints:
  no external dependencies
`;

test("formatter emits stable canonical output", () => {
  const first = formatSourceFile(parseSource(messySource).sourceFile);
  const second = formatSourceFile(parseSource(first).sourceFile);

  assert.equal(
    first,
    `component UserCard
target react typescript

inputs:
  user: User
  onSelect: fn(id: string) -> void

rules:
  show avatar, name, and email
  clicking card calls onSelect(user.id)

constraints:
  no external dependencies

tests:
  clicking card calls onSelect once
`
  );
  assert.equal(second, first);
});
