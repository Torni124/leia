"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSource = analyzeSource;
const language_1 = require("./language");
const parser_1 = require("./parser");
const validator_1 = require("./validator");
function analyzeSource(text, language = language_1.DEFAULT_LANGUAGE) {
    const parseResult = (0, parser_1.parseSource)(text, language);
    const validationDiagnostics = (0, validator_1.validateSourceFile)(parseResult.sourceFile, language);
    return {
        sourceFile: parseResult.sourceFile,
        diagnostics: [...parseResult.diagnostics, ...validationDiagnostics],
        parseDiagnostics: parseResult.diagnostics,
        validationDiagnostics,
        parseResult
    };
}
//# sourceMappingURL=analyze.js.map