"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LANGUAGE = exports.SECTION_KINDS = exports.TEXT_SECTION_KINDS = exports.FIELD_SECTION_KINDS = exports.ROOT_KINDS = exports.DEFAULT_INDENT_UNIT = void 0;
exports.isRootKind = isRootKind;
exports.isSectionKind = isSectionKind;
exports.getSectionSpec = getSectionSpec;
exports.getSectionOrder = getSectionOrder;
exports.isIdentifierText = isIdentifierText;
exports.DEFAULT_INDENT_UNIT = 2;
exports.ROOT_KINDS = ["component", "endpoint", "job", "module"];
exports.FIELD_SECTION_KINDS = ["inputs", "state", "outputs"];
exports.TEXT_SECTION_KINDS = [
    "rules",
    "constraints",
    "preferences",
    "flex",
    "tests",
    "imports"
];
exports.SECTION_KINDS = [...exports.FIELD_SECTION_KINDS, ...exports.TEXT_SECTION_KINDS];
exports.DEFAULT_LANGUAGE = {
    name: "Leia",
    fileExtension: ".leia",
    indentUnit: exports.DEFAULT_INDENT_UNIT,
    targetKeyword: "target",
    rootKinds: exports.ROOT_KINDS,
    sections: [
        { kind: "inputs", contentKind: "fields", unique: true },
        { kind: "state", contentKind: "fields", unique: true },
        { kind: "outputs", contentKind: "fields", unique: true },
        { kind: "rules", contentKind: "text", unique: true },
        { kind: "constraints", contentKind: "text", unique: true },
        { kind: "preferences", contentKind: "text", unique: true },
        { kind: "flex", contentKind: "text", unique: true },
        { kind: "tests", contentKind: "text", unique: true },
        { kind: "imports", contentKind: "text", unique: true }
    ]
};
function isRootKind(text, language = exports.DEFAULT_LANGUAGE) {
    return language.rootKinds.includes(text);
}
function isSectionKind(text, language = exports.DEFAULT_LANGUAGE) {
    return language.sections.some((section) => section.kind === text);
}
function getSectionSpec(kind, language = exports.DEFAULT_LANGUAGE) {
    const spec = language.sections.find((section) => section.kind === kind);
    if (!spec) {
        throw new Error(`Unknown section kind: ${kind}`);
    }
    return spec;
}
function getSectionOrder(language = exports.DEFAULT_LANGUAGE) {
    return language.sections.map((section) => section.kind);
}
function isIdentifierText(text) {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(text);
}
//# sourceMappingURL=language.js.map