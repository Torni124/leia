"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticBag = void 0;
exports.createDiagnostic = createDiagnostic;
exports.hasErrors = hasErrors;
exports.formatDiagnostic = formatDiagnostic;
function createDiagnostic(init) {
    return {
        severity: init.severity,
        code: init.code,
        message: init.message,
        span: init.span,
        ...(init.relatedInformation ? { relatedInformation: init.relatedInformation } : {}),
        ...(init.fixHint ? { fixHint: init.fixHint } : {})
    };
}
class DiagnosticBag {
    diagnostics = [];
    add(diagnostic) {
        this.diagnostics.push(diagnostic);
    }
    error(code, message, span, options) {
        this.add(createDiagnostic({
            severity: "error",
            code,
            message,
            span,
            ...(options?.relatedInformation ? { relatedInformation: options.relatedInformation } : {}),
            ...(options?.fixHint ? { fixHint: options.fixHint } : {})
        }));
    }
    warning(code, message, span, options) {
        this.add(createDiagnostic({
            severity: "warning",
            code,
            message,
            span,
            ...(options?.relatedInformation ? { relatedInformation: options.relatedInformation } : {}),
            ...(options?.fixHint ? { fixHint: options.fixHint } : {})
        }));
    }
    extend(diagnostics) {
        this.diagnostics.push(...diagnostics);
    }
    toArray() {
        return [...this.diagnostics];
    }
}
exports.DiagnosticBag = DiagnosticBag;
function hasErrors(diagnostics) {
    return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}
function formatDiagnostic(diagnostic, filePath) {
    const location = `${diagnostic.span.startLine}:${diagnostic.span.startColumn}`;
    const header = `${diagnostic.severity.toUpperCase()} [${diagnostic.code}] ${filePath ? `${filePath}:` : ""}${location}`;
    const lines = [header, diagnostic.message];
    if (diagnostic.fixHint) {
        lines.push(`Hint: ${diagnostic.fixHint}`);
    }
    if (diagnostic.relatedInformation) {
        for (const related of diagnostic.relatedInformation) {
            lines.push(`Related ${related.span.startLine}:${related.span.startColumn}: ${related.message}`);
        }
    }
    return lines.join("\n");
}
//# sourceMappingURL=diagnostics.js.map