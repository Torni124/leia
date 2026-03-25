# Leia Language Server

This package is the MVP Language Server for Leia.

Its job is intentionally small:

- receive document text from an editor
- run the shared Leia analysis pipeline
- publish diagnostics
- provide whole-document formatting

The language logic still lives in the shared core under [src/analyze.ts](/C:/Users/tbodi/leia/src/analyze.ts), [src/parser.ts](/C:/Users/tbodi/leia/src/parser.ts), and [src/validator.ts](/C:/Users/tbodi/leia/src/validator.ts).

## Why It Exists

The editor should not reimplement Leia parsing rules.

The server is the reusable language engine that:

- editors can talk to
- already powers completions for root kinds, `target`, and top-level sections
- can grow into hover and richer IDE features later
- keeps CLI and IDE behavior consistent

## MVP Features

- live diagnostics on open/change/save
- completion for root kinds, `target`, and top-level section headers
- document formatting

## Local Build

```bash
cd packages/leia-language-server
npm install
npm run build
```
