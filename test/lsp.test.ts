import assert from "node:assert/strict";
import test from "node:test";
import { parseSource } from "../src/parser";
import { diagnosticToLspDiagnostic } from "../src/lsp";

test("maps Leia diagnostics to LSP-style diagnostics", () => {
  const source = `component UserCard
target react typescript

inputs
  user: User
`;
  const result = parseSource(source);
  const diagnostic = result.diagnostics.find((item) => item.code === "syntax.missing_section_colon");

  assert.ok(diagnostic);

  const lspDiagnostic = diagnosticToLspDiagnostic(diagnostic, "file:///UserCard.leia");

  assert.equal(lspDiagnostic.source, "leia");
  assert.equal(lspDiagnostic.severity, 1);
  assert.equal(lspDiagnostic.range.start.line, 3);
  assert.equal(lspDiagnostic.range.start.character, 0);
  assert.match(lspDiagnostic.message, /Expected a colon after section name/);
});
