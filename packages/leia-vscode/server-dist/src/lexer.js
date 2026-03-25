"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lexSource = lexSource;
const diagnostics_1 = require("./diagnostics");
const language_1 = require("./language");
const span_1 = require("./span");
function detectTabs(text) {
    const offsets = [];
    for (let index = 0; index < text.length; index += 1) {
        if (text[index] === "\t") {
            offsets.push(index);
        }
    }
    return offsets;
}
function lexSource(text, language = language_1.DEFAULT_LANGUAGE) {
    const diagnostics = new diagnostics_1.DiagnosticBag();
    const lineStarts = (0, span_1.computeLineStarts)(text);
    const lines = [];
    const comments = [];
    const indentStack = [0];
    for (let lineIndex = 0; lineIndex < lineStarts.length; lineIndex += 1) {
        const start = lineStarts[lineIndex] ?? 0;
        const nextStart = lineStarts[lineIndex + 1] ?? text.length;
        const rawLineWithNewline = text.slice(start, nextStart);
        const rawLine = rawLineWithNewline.endsWith("\n")
            ? rawLineWithNewline.slice(0, -1)
            : rawLineWithNewline;
        const lineSpan = (0, span_1.spanFromOffsets)(lineStarts, start, nextStart);
        const fullLineSpan = (0, span_1.spanFromOffsets)(lineStarts, start, start + rawLine.length);
        const firstNonWhitespaceIndex = rawLine.search(/\S/);
        if (firstNonWhitespaceIndex === -1) {
            lines.push({
                kind: "blank",
                lineNumber: lineIndex + 1,
                rawText: rawLine,
                span: fullLineSpan,
                lineSpan,
                indentText: "",
                indent: 0,
                contentText: "",
                contentSpan: null
            });
            continue;
        }
        const indentText = rawLine.slice(0, firstNonWhitespaceIndex);
        const contentText = rawLine.slice(firstNonWhitespaceIndex);
        const indentTabOffsets = detectTabs(indentText);
        for (const tabOffset of indentTabOffsets) {
            diagnostics.error("syntax.tabs_not_allowed", "Tabs are not allowed in Leia files.", (0, span_1.spanFromOffsets)(lineStarts, start + tabOffset, start + tabOffset + 1), { fixHint: "Replace tabs with spaces using 2 spaces per indentation level." });
        }
        if (indentText.length % language.indentUnit !== 0) {
            diagnostics.error("syntax.invalid_indentation_width", `Indentation must use multiples of ${language.indentUnit} spaces.`, (0, span_1.spanFromOffsets)(lineStarts, start, start + indentText.length), { fixHint: `Use exactly ${language.indentUnit} spaces for each indentation level.` });
        }
        const contentTabOffsets = detectTabs(contentText);
        for (const tabOffset of contentTabOffsets) {
            diagnostics.error("syntax.tabs_not_allowed", "Tabs are not allowed in Leia files.", (0, span_1.spanFromOffsets)(lineStarts, start + firstNonWhitespaceIndex + tabOffset, start + firstNonWhitespaceIndex + tabOffset + 1), { fixHint: "Replace tabs with spaces." });
        }
        const indent = Math.floor(indentText.length / language.indentUnit);
        const contentStart = start + firstNonWhitespaceIndex;
        const contentSpan = (0, span_1.spanFromOffsets)(lineStarts, contentStart, contentStart + contentText.length);
        if (contentText.startsWith("#")) {
            comments.push({
                nodeType: "CommentLine",
                indent,
                text: contentText.slice(1).trim(),
                span: contentSpan
            });
            lines.push({
                kind: "comment",
                lineNumber: lineIndex + 1,
                rawText: rawLine,
                span: fullLineSpan,
                lineSpan,
                indentText,
                indent,
                contentText,
                contentSpan
            });
            continue;
        }
        const currentIndent = indentStack[indentStack.length - 1] ?? 0;
        if (indent > currentIndent + 1) {
            diagnostics.error("syntax.unexpected_indent", "Unexpected indentation increase.", (0, span_1.spanFromOffsets)(lineStarts, start, start + indentText.length), { fixHint: `Increase indentation by only one level (${language.indentUnit} spaces) at a time.` });
        }
        if (indent > currentIndent) {
            indentStack.push(indent);
        }
        else if (indent < currentIndent) {
            while (indentStack.length > 0 && (indentStack[indentStack.length - 1] ?? 0) > indent) {
                indentStack.pop();
            }
            if ((indentStack[indentStack.length - 1] ?? 0) !== indent) {
                diagnostics.error("syntax.unexpected_dedent", "Unexpected dedent does not match any previous indentation level.", (0, span_1.spanFromOffsets)(lineStarts, start, start + indentText.length), {
                    fixHint: `Dedent back to a previously used indentation level in multiples of ${language.indentUnit} spaces.`
                });
                indentStack.push(indent);
            }
        }
        lines.push({
            kind: "content",
            lineNumber: lineIndex + 1,
            rawText: rawLine,
            span: fullLineSpan,
            lineSpan,
            indentText,
            indent,
            contentText,
            contentSpan
        });
    }
    return {
        lines,
        comments,
        diagnostics: diagnostics.toArray(),
        lineStarts
    };
}
//# sourceMappingURL=lexer.js.map