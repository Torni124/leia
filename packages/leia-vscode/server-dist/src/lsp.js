"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sourceSpanToLspRange = sourceSpanToLspRange;
exports.diagnosticToLspDiagnostic = diagnosticToLspDiagnostic;
function sourceSpanToLspRange(span) {
    return {
        start: {
            line: Math.max(0, span.startLine - 1),
            character: Math.max(0, span.startColumn - 1)
        },
        end: {
            line: Math.max(0, span.endLine - 1),
            character: Math.max(0, span.endColumn - 1)
        }
    };
}
function diagnosticToLspDiagnostic(diagnostic, uri) {
    return {
        severity: diagnostic.severity === "error" ? 1 : 2,
        code: diagnostic.code,
        source: "leia",
        message: diagnostic.fixHint
            ? `${diagnostic.message}\nHint: ${diagnostic.fixHint}`
            : diagnostic.message,
        range: sourceSpanToLspRange(diagnostic.span),
        ...(diagnostic.relatedInformation
            ? {
                relatedInformation: diagnostic.relatedInformation.map((item) => ({
                    message: item.message,
                    location: {
                        uri,
                        range: sourceSpanToLspRange(item.span)
                    }
                }))
            }
            : {})
    };
}
//# sourceMappingURL=lsp.js.map