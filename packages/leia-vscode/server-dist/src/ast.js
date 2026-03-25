"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFieldSection = isFieldSection;
exports.isTextSection = isTextSection;
exports.findSection = findSection;
function isFieldSection(section) {
    return section.kind === "inputs" || section.kind === "state" || section.kind === "outputs";
}
function isTextSection(section) {
    return !isFieldSection(section);
}
function findSection(sourceFile, kind) {
    return sourceFile.root?.sections.find((section) => section.kind === kind);
}
//# sourceMappingURL=ast.js.map