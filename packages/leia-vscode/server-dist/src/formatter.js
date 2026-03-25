"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatSourceFile = formatSourceFile;
const language_1 = require("./language");
function formatSourceFile(sourceFile, language = language_1.DEFAULT_LANGUAGE) {
    const root = sourceFile.root;
    if (!root) {
        return "";
    }
    const lines = [];
    lines.push(root.name ? `${root.kind} ${root.name.text}` : root.kind);
    if (root.target) {
        lines.push(`target ${root.target.parts.join(" ")}`.trimEnd());
    }
    const orderedSections = sortSections(root.sections, language);
    if (orderedSections.length > 0) {
        lines.push("");
    }
    orderedSections.forEach((section, index) => {
        if (index > 0) {
            lines.push("");
        }
        lines.push(`${section.kind}:`);
        if (section.kind === "inputs" || section.kind === "state" || section.kind === "outputs") {
            for (const field of section.content) {
                lines.push(`  ${formatField(field)}`);
            }
            return;
        }
        for (const item of section.content) {
            lines.push(`  ${item.text}`);
        }
    });
    return `${lines.map((line) => line.replace(/[ \t]+$/u, "")).join("\n")}\n`;
}
function sortSections(sections, language) {
    const order = new Map();
    (0, language_1.getSectionOrder)(language).forEach((kind, index) => {
        order.set(kind, index);
    });
    return [...sections].sort((left, right) => {
        const leftIndex = order.get(left.kind) ?? Number.MAX_SAFE_INTEGER;
        const rightIndex = order.get(right.kind) ?? Number.MAX_SAFE_INTEGER;
        if (leftIndex !== rightIndex) {
            return leftIndex - rightIndex;
        }
        return left.span.start - right.span.start;
    });
}
function formatField(field) {
    const base = `${field.name.text}: ${field.typeText}`;
    return field.defaultValueText === null ? base : `${base} = ${field.defaultValueText}`;
}
//# sourceMappingURL=formatter.js.map