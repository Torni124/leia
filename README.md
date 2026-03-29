# Leia Intent Spec Tooling

Leia is a working name for an AI-first specification language for describing software intent, constraints, and tests in a structured way that an LLM can later interpret to generate code.

This repository implements a real language-toolchain foundation rather than a prompt wrapper:

- an indentation-aware lexer
- a parser
- typed AST nodes with source spans
- semantic validation with stable diagnostic codes
- a formatter
- a CLI for checking, AST inspection, and formatting
- tests for parser, validator, and formatter behavior

## Quick Start

Install from GitHub:

```bash
npm install -g github:Torni124/leia
```

Generate a prompt file from a Leia spec:

```bash
leia path/to/file.leia
```

That writes `path/to/file.prompt.txt` beside the spec.

## VS Code Extension

Leia also has a VS Code extension for `.leia` files.

Install from the Marketplace:

```bash
code --install-extension BodieOrni.leia-language
```

You can also search for `Leia` in the VS Code Extensions view.

Current extension features:

- `.leia` file association
- syntax highlighting
- live diagnostics
- completion for root kinds, `target`, and top-level section headers
- document formatting
- `Leia: Show Status` command for language-server troubleshooting

If you want to install from this repository instead of the Marketplace:

```bash
npm run package:vscode
code --install-extension packages/leia-vscode/<generated-vsix-file>.vsix
```

The extension package lives under [packages/leia-vscode](/C:/Users/tbodi/leia/packages/leia-vscode).

## What Leia Looks Like

```leia
component UserCard
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
  clicking expand toggles expanded
  if expanded show recent activity

constraints:
  no external dependencies
  use functional components
  tailwind only

preferences:
  prefer small helper functions
  prefer pure derived values

flex:
  helper names
  internal decomposition
  memoization strategy

tests:
  clicking card calls onSelect once
  collapsed state hides activity
  expanded state shows activity
```

## V1 Grammar

Leia v1 is indentation-sensitive and uses exactly 2 spaces per indentation level.

Rules:

- tabs are forbidden
- mixed indentation is forbidden
- blank lines are allowed
- whole-line comments begin with `#`
- a file contains exactly one root declaration in v1

Top-level shape:

```txt
<root-kind> <Identifier>
target <word> [word...]

<section-name>:
  ...
```

Supported root kinds:

- `component`
- `endpoint`
- `job`
- `module`

Supported section kinds:

- field sections: `inputs`, `state`, `outputs`
- text sections: `rules`, `constraints`, `preferences`, `flex`, `tests`, `imports`

`flex` is optional. Unspecified details are flexible by default; an explicit `flex:` block is only for calling out areas where model discretion is especially intended.

Field entries:

```txt
name: Type
name: Type = defaultValue
```

Type annotations are intentionally preserved as raw text in v1, including forms like:

- `string`
- `bool`
- `List<Todo>`
- `User | NotFound`
- `fn(id: string) -> void`

Text-section items may be:

- plain freeform lines
- dash-prefixed freeform lines

Both are normalized into `TextItem` nodes.

## Package Layout

- [src/ast.ts](/C:/Users/tbodi/leia/src/ast.ts)
- [src/analyze.ts](/C:/Users/tbodi/leia/src/analyze.ts)
- [src/span.ts](/C:/Users/tbodi/leia/src/span.ts)
- [src/diagnostics.ts](/C:/Users/tbodi/leia/src/diagnostics.ts)
- [src/language.ts](/C:/Users/tbodi/leia/src/language.ts)
- [src/lexer.ts](/C:/Users/tbodi/leia/src/lexer.ts)
- [src/lsp.ts](/C:/Users/tbodi/leia/src/lsp.ts)
- [src/parser.ts](/C:/Users/tbodi/leia/src/parser.ts)
- [src/validator.ts](/C:/Users/tbodi/leia/src/validator.ts)
- [src/formatter.ts](/C:/Users/tbodi/leia/src/formatter.ts)
- [src/cli.ts](/C:/Users/tbodi/leia/src/cli.ts)
- [src/index.ts](/C:/Users/tbodi/leia/src/index.ts)
- [packages/leia-language-server/src/server.ts](/C:/Users/tbodi/leia/packages/leia-language-server/src/server.ts)
- [packages/leia-vscode/src/extension.ts](/C:/Users/tbodi/leia/packages/leia-vscode/src/extension.ts)

## Architecture

### Lexer

The lexer is line-aware rather than token-heavy. It scans source once and records:

- line starts
- indentation depth
- blank lines
- whole-line comments
- raw content spans
- indentation diagnostics such as tabs, odd indentation width, and unexpected dedents

This keeps the parser readable while still producing enough structure for diagnostics, formatting, and future IDE support.

### Parser

The parser is line-oriented because the current grammar is block-based and indentation-sensitive.

Key choices:

- parse the root declaration first
- treat `target` as a dedicated top-level declaration
- recognize sections through centralized language metadata
- parse field sections as `name: Type` with optional raw defaults
- normalize both plain and dash-prefixed text items
- recover where practical so one pass can report multiple issues

### Validator

Validation is intentionally separate from syntax parsing.

Current semantic checks include:

- missing required `target`
- duplicate unique sections
- duplicate field names inside field sections
- empty `rules`, `constraints`, or `tests` sections
- warning when `tests` is missing
- warning when constraints exist without tests
- warning when preferences exist without rules

### Diagnostics

Diagnostics carry:

- severity
- stable machine-readable code
- message
- precise source span
- optional related information
- optional fix hint

This shape is suitable for CLI output now and LSP diagnostics later.

### Analysis Pipeline

[src/analyze.ts](/C:/Users/tbodi/leia/src/analyze.ts) combines parse and validation phases into a single analysis result. The CLI uses that today, and a future LSP can reuse the same entry point for diagnostics-on-open and diagnostics-on-save.

### LSP Adapter

[src/lsp.ts](/C:/Users/tbodi/leia/src/lsp.ts) is the thin conversion layer between Leia diagnostics and editor-facing LSP-style ranges and severities. That keeps the parser and validator editor-agnostic while still making the language server trivial.

## IDE MVP

The repository now includes the smallest real IDE architecture:

- a shared core language engine in `src/`
- a thin language server in [packages/leia-language-server/src/server.ts](/C:/Users/tbodi/leia/packages/leia-language-server/src/server.ts)
- a thin VS Code wrapper in [packages/leia-vscode/src/extension.ts](/C:/Users/tbodi/leia/packages/leia-vscode/src/extension.ts)

The MVP server supports:

- diagnostics on open, change, and save
- completion for root kinds, `target`, and top-level section headers
- whole-document formatting

The VS Code extension currently provides:

- `.leia` file association
- basic syntax highlighting
- diagnostics, completion, and formatting through the bundled language server
- `Leia: Show Status` for extension/server troubleshooting

Local dev flow:

```bash
cd packages/leia-vscode
npm install
npm run build
```

That build now compiles the language server and copies it into the extension package so the extension can run both in local debug mode and in a packaged install.

Then open `packages/leia-vscode` in VS Code and press `F5` to launch an Extension Development Host.

To build an installable VS Code package:

```bash
npm run package:vscode
```

That delegates to `packages/leia-vscode` and produces a `.vsix` file there, ready for local installation with `code --install-extension`.

## Install

From GitHub, the easiest install is:

```bash
npm install -g github:Torni124/leia
```

That installs the CLI as `leia`.

If you want a local editable checkout instead:

```bash
git clone https://github.com/Torni124/leia.git
cd leia
npm install
npm link
```

After either install path, the shortest spec-to-prompt flow is:

```bash
leia path/to/file.leia
```

That validates the spec and writes `path/to/file.prompt.txt` beside it.

If you do not want a global install, you can also run it directly from a clone:

```bash
node dist/src/cli.js path/to/file.leia
```

## CLI

Build first:

```bash
npm install
npm run build
```

Commands:

```bash
leia path/to/file.leia
leia check path/to/file.leia
leia ast path/to/file.leia
leia format path/to/file.leia
leia format path/to/file.leia --write
leia prompt path/to/file.leia
leia prompt path/to/file.leia --style strict
leia prompt path/to/file.leia --style acceptance
leia prompt path/to/file.leia --with-source
leia handoff path/to/file.leia
leia handoff path/to/file.leia --out path/to/file.prompt.txt
leia handoff path/to/file.leia --style strict
leia handoff path/to/file.leia --style acceptance
leia handoff path/to/file.leia --with-source
```

Behavior:

- `leia path/to/file.leia` is the shortest path: it validates the spec and writes a sibling `path/to/file.prompt.txt`
- `check` parses and validates, prints diagnostics, exits non-zero on errors
- `ast` prints the AST as JSON and also emits diagnostics
- `format` prints formatted output or overwrites the file with `--write`
- `prompt` prints a compiled model-facing implementation brief derived from the Leia AST
- `handoff` writes that compiled brief to disk and prints the output path
- `--style` selects a prompt compiler variant: `strict` or `acceptance`
- `--with-source` appends a source appendix when you want the compiled brief plus a readable Leia rendering

Example:

```bash
leia examples/generate-json-report.leia
leia prompt examples/generate-json-report.leia
```

That command compiles the Leia file into a model-facing brief instead of just wrapping the raw `.leia` text. You can pipe its output directly into another tool or paste the rendered result into a coding model.

If you just want a prompt file as quickly as possible, use only the file path:

```bash
leia examples/generate-json-report.leia
```

That writes `examples/generate-json-report.prompt.txt` next to the spec using the default `strict` style.

Prompt styles:

- `strict`: default style, with stronger priority ordering and explicit forbidden failure modes
- `acceptance`: puts the acceptance criteria first and treats them as the completion gate

If you do not want any manual pasting at all, use:

```bash
leia handoff examples/generate-json-report.leia
```

That writes a sibling file such as `examples/generate-json-report.prompt.txt` containing the compiled implementation brief the coding model needs.

For Python CLI specs, the generated handoff prompt now explicitly requests a `.py` file named `script_under_test.py`.

## Python Eval Harness

For testing generated Python code against a stable contract, use:

- [examples/generate-json-report.leia](/C:/Users/tbodi/leia/examples/generate-json-report.leia)
- [python_eval/generate_json_report/README.md](/C:/Users/tbodi/leia/python_eval/generate_json_report/README.md)

The harness expects a candidate file at:

- [python_eval/generate_json_report/candidate/script_under_test.py](/C:/Users/tbodi/leia/python_eval/generate_json_report/candidate/script_under_test.py)

Run just the Python harness with:

```bash
npm run test:python-harness
```

Or let it run as part of the full suite:

```bash
npm test
```

To compare two generated Python outputs by hash and diff, use:

```bash
powershell -ExecutionPolicy Bypass -File scripts/compare-python-runs.ps1 -Baseline path/to/run1.py -Candidate path/to/run2.py
```

To compare them and also run the Python harness against both:

```bash
powershell -ExecutionPolicy Bypass -File scripts/compare-python-runs.ps1 -Baseline path/to/run1.py -Candidate path/to/run2.py -RunTests
```

## Extending Keywords Later

Keyword evolution is centralized in [src/language.ts](/C:/Users/tbodi/leia/src/language.ts).

To add or remove a root keyword:

1. Update `ROOT_KINDS`.
2. Update `DEFAULT_LANGUAGE.rootKinds` if needed.
3. Add validator rules only if the new root kind needs special semantics.

To add or remove a section:

1. Update the section-kind declarations in [src/language.ts](/C:/Users/tbodi/leia/src/language.ts).
2. Add or remove the corresponding `SectionSpec` in `DEFAULT_LANGUAGE.sections`.
3. Decide whether the section uses `fields` or `text` content.
4. Add validator logic only when the section has special semantics.
5. Add tests for the new behavior.

Because parser and validator both read the centralized language definition, grammar evolution stays local instead of being hardcoded across many files.

## Future LSP Integration Points

The current design intentionally leaves room for editor and language-server features:

- source spans already exist on meaningful AST nodes
- diagnostics already resemble LSP diagnostics
- the lexer tracks line starts for editor mappings
- validation is separate, which makes incremental semantic passes easier
- `language.ts` can become shared metadata for completions and hover help
- raw type-text spans create a clean seam for richer type parsing later

Likely next steps:

- symbol discovery for root declarations and fields
- completion for section names and keywords
- hover help based on diagnostics and future semantic metadata
- go-to-definition once imports and references exist
- incremental parsing for changed regions

## Current Limitations

- trailing comments are not preserved yet
- formatter is intentionally comment-lossy in v1
- type annotations are stored as raw text rather than a type AST
- nested blocks are rejected in v1
- imports are parsed with minimal semantics
- multiple root declarations are not yet supported
- cross-file references and code generation backends are not yet implemented

## Tests

The tests cover:

- valid example parsing
- missing target
- duplicate section
- duplicate field
- bad indentation
- tabs in indentation
- unknown section
- malformed field line
- freeform rules parsing
- formatter stability
