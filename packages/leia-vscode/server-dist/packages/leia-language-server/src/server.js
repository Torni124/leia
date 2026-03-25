"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const analyze_1 = require("../../../src/analyze");
const completion_1 = require("../../../src/completion");
const formatter_1 = require("../../../src/formatter");
const lsp_1 = require("../../../src/lsp");
const connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
const documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
connection.onInitialize(() => ({
    capabilities: {
        textDocumentSync: node_1.TextDocumentSyncKind.Incremental,
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
    const analysis = (0, analyze_1.analyzeSource)(document.getText());
    if (analysis.diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
        return [];
    }
    const formatted = (0, formatter_1.formatSourceFile)(analysis.sourceFile);
    if (formatted === document.getText()) {
        return [];
    }
    return [
        node_1.TextEdit.replace({
            start: { line: 0, character: 0 },
            end: document.positionAt(document.getText().length)
        }, formatted)
    ];
});
connection.onCompletion((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }
    return (0, completion_1.getCompletionSuggestions)(document.getText(), params.position).map((suggestion) => ({
        label: suggestion.label,
        kind: suggestion.kind === "section"
            ? node_1.CompletionItemKind.Module
            : node_1.CompletionItemKind.Keyword,
        detail: suggestion.detail,
        documentation: suggestion.documentation,
        insertText: suggestion.insertText,
        insertTextFormat: suggestion.insertTextFormat === "snippet"
            ? node_1.InsertTextFormat.Snippet
            : node_1.InsertTextFormat.PlainText,
        filterText: suggestion.filterText,
        sortText: suggestion.sortText
    }));
});
async function validateDocument(document) {
    const analysis = (0, analyze_1.analyzeSource)(document.getText());
    const diagnostics = analysis.diagnostics.map((diagnostic) => {
        const lspDiagnostic = (0, lsp_1.diagnosticToLspDiagnostic)(diagnostic, document.uri);
        return {
            severity: lspDiagnostic.severity === 1
                ? node_1.DiagnosticSeverity.Error
                : node_1.DiagnosticSeverity.Warning,
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
//# sourceMappingURL=server.js.map