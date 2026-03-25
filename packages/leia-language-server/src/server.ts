import {
  CompletionItemKind,
  InsertTextFormat,
  createConnection,
  type Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  TextEdit,
  type InitializeResult
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { analyzeSource } from "../../../src/analyze";
import { getCompletionSuggestions } from "../../../src/completion";
import { formatSourceFile } from "../../../src/formatter";
import { diagnosticToLspDiagnostic } from "../../../src/lsp";

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((): InitializeResult => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: {},
    documentFormattingProvider: true
  }
}));

documents.onDidOpen(async (event) => {
  await validateDocument(event.document);
});

documents.onDidChangeContent(async (event) => {
  await validateDocument(event.document);
});

documents.onDidSave(async (event) => {
  await validateDocument(event.document);
});

documents.onDidClose((event) => {
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

connection.onDocumentFormatting((params) => {
  const document = documents.get(params.textDocument.uri);

  if (!document) {
    return [];
  }

  const analysis = analyzeSource(document.getText());

  if (analysis.diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return [];
  }

  const formatted = formatSourceFile(analysis.sourceFile);

  if (formatted === document.getText()) {
    return [];
  }

  return [
    TextEdit.replace(
      {
        start: { line: 0, character: 0 },
        end: document.positionAt(document.getText().length)
      },
      formatted
    )
  ];
});

connection.onCompletion((params) => {
  const document = documents.get(params.textDocument.uri);

  if (!document) {
    return [];
  }

  return getCompletionSuggestions(document.getText(), params.position).map((suggestion) => ({
    label: suggestion.label,
    kind:
      suggestion.kind === "section"
        ? CompletionItemKind.Module
        : CompletionItemKind.Keyword,
    detail: suggestion.detail,
    documentation: suggestion.documentation,
    insertText: suggestion.insertText,
    insertTextFormat:
      suggestion.insertTextFormat === "snippet"
        ? InsertTextFormat.Snippet
        : InsertTextFormat.PlainText,
    filterText: suggestion.filterText,
    sortText: suggestion.sortText
  }));
});

async function validateDocument(document: TextDocument): Promise<void> {
  const analysis = analyzeSource(document.getText());
  const diagnostics: Diagnostic[] = analysis.diagnostics.map((diagnostic) => {
    const lspDiagnostic = diagnosticToLspDiagnostic(diagnostic, document.uri);

    return {
      severity:
        lspDiagnostic.severity === 1
          ? DiagnosticSeverity.Error
          : DiagnosticSeverity.Warning,
      code: lspDiagnostic.code,
      source: lspDiagnostic.source,
      message: lspDiagnostic.message,
      range: lspDiagnostic.range,
      ...(lspDiagnostic.relatedInformation
        ? {
            relatedInformation: lspDiagnostic.relatedInformation.map((item) => ({
              location: item.location,
              message: item.message
            }))
          }
        : {})
    };
  });

  connection.sendDiagnostics({
    uri: document.uri,
    diagnostics
  });
}

documents.listen(connection);
connection.listen();
